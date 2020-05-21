/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow, Menu, nativeImage, Tray, dialog, globalShortcut, MenuItem } from 'electron';
import log from 'electron-log';
import $ from 'jquery';
const contextMenu = require('electron-context-menu');
const { localStorage } = require('electron-browser-storage');

var path = require('path');
var shell = require('electron').shell;
var fs = require('fs');
var https = require('https');

// Handle right-clicks
contextMenu({
  menu: (actions, params, browserWindow) => [
    actions.cut({
      label: "Cut",
      accelerator: "CmdOrCtrl+X"
    }),
    actions.copy({
      label: "Copy",
      accelerator: "CmdOrCtrl+C"
    }),
    actions.copyLink({
      label: "Copy link"
    }),
    actions.paste({
      label: "Paste",
      accelerator: "CmdOrCtrl+V"
    }),
    actions.saveImageAs({
      label: "Save image"
    })
]});

// Initialize main window and tray icon
let mainWindow = null;
let tray = null;

// Add source mapping to production builds
if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

// Require debugger in dev mode
if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

// Install extensions function which runs debugger in dev mode
const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

// Add event listeners...

app.on('window-all-closed', () => {
  /* Respect the macOS convention of having the application in memory even
  ** after all windows have been closed. macOS code is only there in case
  ** there are plans to port the app to macOS.
  ** TODO: Port the app to macOS */
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Check if app is locked and display the currently running app instead
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  /* Set download path if the app is loaded even before the user gets anything on the screen
  ** so the updater can initialize correctly. The updater gets loaded as soon as the user sees
  ** sees something on the screen. Communicating between classes is not a thing in Electron for
  ** security reasons so we use localStorage instead. Also resolving the path on Windows is
  ** currently bugged so this should be fixed soon. Linux displays a file save dialog so the
  ** localStorage item is only here due to a bug. Hey, we made a feature!
  **
  ** TODO: Fix Windows version to use the Download folder which is the correct path.
  ** TODO: Fix Linux version not to throw errors while trying to overwrite the running process
  **       and instead re-open the dialog prompting the user to try again. */
  app.on('ready', () => {
    if (process.platform === "win32") {
      localStorage.setItem("dlpath", path.resolve(app.getPath("downloads"), "desktop.exe"));
    } else if (process.platform === "linux") {
      localStorage.setItem("dlpath", path.resolve(app.getPath("exe"), "desktop.AppImage"));
    } else {
      localStorage.setItem("dlpath", "");
    }

    // Development extensions, should start Chromium debugger in dev mode
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      installExtensions();
    }

    // Set tray context menu
    const iconPath = path.join(__dirname, 'icon.png');
    let appIcon = nativeImage.createFromPath(iconPath);
    tray = new Tray(appIcon);
    const trayMenu = Menu.buildFromTemplate([
        { label: 'Show koyu.space', click:  function(){
            mainWindow.show();
        } },
        { label: 'Quit', click:  function(){
            app.isQuiting = true;
            app.quit();
        } }
    ]);
    tray.setContextMenu(trayMenu)

    // Create a browser window
    mainWindow = new BrowserWindow({
      show: false,
      width: 1024,
      height: 728,
      icon: path.join(__dirname, '/icon.png'),
      frame: false,
      backgroundColor: "#222233",
      minWidth: 600,
      minHeight: 300
    });

    // Initialize firstload variable and load the actual app
    var firstload = true;
    mainWindow.loadURL(`file://${__dirname}/app.html`);

    /* This event gets fired on every page that finished loading
    ** including the pages in browser mode. The code checks if
    ** the application has been started the first time so while
    ** switching pages when having the app not in focus is not
    ** trying to refocus the app again. */
    mainWindow.webContents.on('did-finish-load', () => {
      if (!mainWindow) {
        throw new Error('"mainWindow" is not defined');
      }
      if (firstload) {
        if (process.env.START_MINIMIZED) {
          event.preventDefault();
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
        firstload = false;
      }
    });

    // Hide on close
    mainWindow.on('close', function(event) {
      if (!app.isQuiting) {
        event.preventDefault();
        mainWindow.hide();
      }
      return false;
    });

    // Hide on minimize
    mainWindow.on('minimize', function(event) {
        event.preventDefault();
        mainWindow.hide();
    });

    // Destroy application before quitting so it doesn't hang as a zombie process
    mainWindow.on('before-quit', () => {
      mainWindow.removeAllListeners('close');
      mainWindow.close();
    });

    // Handle downloads
    function download(url, dest) {
      mainWindow.webContents.executeJavaScript("var $ = require('jquery'); $(\"#desktop__loading\").attr(\"src\", \"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBzdHlsZT0ibWFyZ2luOiBhdXRvOyBkaXNwbGF5OiBibG9jazsiIHdpZHRoPSIyMDBweCIgaGVpZ2h0PSIyMDBweCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIj48ZGVmcz4gIDxjbGlwUGF0aCBpZD0ibGRpby15ZzdhOGM1OHBvYi1jcCIgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiPiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyOCI+PC9jaXJjbGU+ICA8L2NsaXBQYXRoPjwvZGVmcz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIzNyIgZmlsbD0iIzIyMjIzMyIgc3Ryb2tlPSIjM2MzYzRkIiBzdHJva2Utd2lkdGg9IjYiPjwvY2lyY2xlPjxnIGNsaXAtcGF0aD0idXJsKCNsZGlvLXlnN2E4YzU4cG9iLWNwKSI+ICA8Zz4gICAgPGcgdHJhbnNmb3JtPSJzY2FsZSgwLjUpIj4gICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNTAsLTUwKSI+ICAgICAgICA8cGF0aCBmaWxsPSIjZmU1M2UxIiBkPSJNNzEuOTg5LDQ0LjY5NFY4LjcxMWMwLTAuNDE5LTAuMzQtMC43NTktMC43NTktMC43NTlIMjguNzY5Yy0wLjQxOSwwLTAuNzU5LDAuMzQtMC43NTksMC43NTl2MzUuOTgzSDYuMDY5IGMtMC45MTQsMC0xLjQwNSwxLjA3NS0wLjgwNywxLjc2Nmw0My45MzEsNDUuMjJjMC40MjUsMC40OTEsMS4xODgsMC40OTEsMS42MTMsMGw0My45MzEtNDUuMjJjMC41OTktMC42OTEsMC4xMDgtMS43NjYtMC44MDctMS43NjYgSDcxLjk4OXoiPjwvcGF0aD4gICAgICA8L2c+ICAgIDwvZz4gICAgPGFuaW1hdGVUcmFuc2Zvcm0gYXR0cmlidXRlTmFtZT0idHJhbnNmb3JtIiB0eXBlPSJ0cmFuc2xhdGUiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiBkdXI9IjFzIiBrZXlUaW1lcz0iMDsxIiB2YWx1ZXM9IjUwIC0yMDs1MCAxMjAiPjwvYW5pbWF0ZVRyYW5zZm9ybT4gIDwvZz48L2c+PC9zdmc+\"); $(\"#notice\").html(\"Downloading update...\");");
      var file = fs.createWriteStream(dest);
      var request = https.get(url, function(response) {
          response.pipe(file);
          file.on('finish', function() {
              file.close(function() {
                console.log("file saved.")
              }); // close() is async, call cb after close completes.
          });
      }).on('error', function(e) { // Handle errors
          fs.unlink(dest); // Delete the file async. (But we don't check the result)
      });
    }

    app.on('web-contents-created', (e, contents) => {
      if (contents.getType() == 'webview') {
        contents.session.clearCache(()=>{});

        var handleNavigation = (e, url) => {
          if (url.includes(".mp4")
          || url.includes(".mp3")
          || url.includes(".ogg")
          || url.includes(".flac")
          || url.includes(".wav")
          || url.includes(".mkv")
          || url.includes(".mov")
          || url.includes(".wmv")
          || url.includes(".oga")
          || url.includes(".ogv")
          || url.includes(".opus")
          || url.includes(".webm")
          || url.includes(".AppImage")) {
            e.preventDefault();
            var toLocalPath = path.resolve(app.getPath("downloads"), path.basename(url));
            var userChosenPath = dialog.showSaveDialog({ defaultPath: toLocalPath });
            if(userChosenPath){
                download(url, userChosenPath);
            }
          }
        }
        contents.on('will-navigate', handleNavigation);

        // Open third-party links in browser
        var handleWillNavigate = (e, url) => {
          if (!url.includes("https://koyu.space") || url.includes("/@")) {
            e.preventDefault();
            shell.openExternal(url);
          }
        }
        contents.on('will-navigate', handleWillNavigate);

        var handleRedirect = (e, url) => {
          if(!url.includes("https://koyu.space")) {
            e.preventDefault();
            shell.openExternal(url);
          } else {
            e.preventDefault();
            contents.loadURL(url);
          }
        }
        contents.on('new-window', handleRedirect);
      }
    });
  });
}