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
import { app, BrowserWindow, Menu, nativeImage, Tray, dialog } from 'electron';
import log from 'electron-log';
import MenuBuilder from './menu';
import $ from 'jquery';
const contextMenu = require('electron-context-menu');

var path = require('path');
var shell = require('electron').shell;
var fs = require('fs');
var https = require('https');

//Handle right-clicks
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

let mainWindow = null;
let tray = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

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

  app.on('ready', () => {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      installExtensions();
    }

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

    mainWindow = new BrowserWindow({
      show: false,
      width: 1024,
      height: 728,
      icon: path.join(__dirname, '/icon.png'),
      backgroundColor: '#222233'
    });

    mainWindow.loadURL(`file://${__dirname}/app.html`);

    mainWindow.webContents.on('did-finish-load', () => {
      if (!mainWindow) {
        throw new Error('"mainWindow" is not defined');
      }
      if (process.env.START_MINIMIZED) {
        event.preventDefault();
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    mainWindow.on('close', function(event) {
      if (!app.isQuiting) {
        event.preventDefault();
        mainWindow.hide();
      }
      return false;
    });

    mainWindow.on('minimize', function(event) {
        event.preventDefault();
        mainWindow.hide();
    });

    const menuBuilder = new MenuBuilder(mainWindow);
    menuBuilder.buildMenu();

    if (process.env.NODE_ENV === 'production') {
      mainWindow.setMenu(null);
    }

    // Open third-party links in browser
    var handleRedirect = (e, url) => {
      if(url != mainWindow.webContents.getURL()) {
        e.preventDefault();
        shell.openExternal(url);
      }
    }
    mainWindow.webContents.on('new-window', handleRedirect);

    // Handle downloads
    function download(url, dest, cb) {
      var file = fs.createWriteStream(dest);
      var request = https.get(url, function(response) {
          response.pipe(file);
          file.on('finish', function() {
              file.close(cb); // close() is async, call cb after close completes.
          });
      }).on('error', function(e) { // Handle errors
          fs.unlink(dest); // Delete the file async. (But we don't check the result)
          if (cb) cb(e.message);
      });
    }
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
      || url.includes(".webm")) {
        e.preventDefault();
        var toLocalPath = path.resolve(app.getPath("downloads"), path.basename(url));
        var userChosenPath = dialog.showSaveDialog({ defaultPath: toLocalPath });
        if(userChosenPath){
            download(url, userChosenPath);
        }
      }
    }
    mainWindow.webContents.on('will-navigate', handleNavigation);
    
  });
}
