// @flow
import { remote } from 'electron';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import routes from '../constants/routes';
import './Home.css';
import spinner from './loading.svg';
import buncry from './buncry.png';
import download_spinner from './download.svg';
import icon from './logo.png';
import $ from 'jquery';
import TitleBar from 'frameless-titlebar';

const currentWindow = remote.getCurrentWindow();

var shell = require('electron').shell;
var fs = require('fs');
var https = require('https');
var path = require('path');
var app = require('electron').app;

// Initialize variables
type Props = {};
var error = false;
var triggerupdate = false;
var updatetriggered = false;
var messages = ["Loading...", "Looking for files...", "Making new friends...", "Helping grandpa out...",
                "Doing cool skate tricks...", "Listening to Vaporwave...", "Doing some important work..."];
var state = 0;
var loaded = false;

// Timeout after 10 seconds with timeout error
window.addEventListener('online', function() {
  window.setTimeout(function() {
    error = false;
  }, 10000);
});

// Main class
export default class Home extends Component<Props> {
  props: Props;

  componentDidMount() {
    $(document).ready(function() {
      window.setInterval(function() {
        // Check if koyu.space is online
        $.get("https://koyu.space/api/v1/instance", function() {
          // Connect to update server and check for updates
          $.get("https://updates.koyu.space/desktop/latest?_=" + new Date().getTime(), function(data) {
            if (data.split("\n")[0] === "25") {
              console.log("ok: "+data.split("\n")[0]);
              location.href = "https://koyu.space";
              loaded = true;
            } else {
              // Updater only works on Windows now
              if (process.platform === "win32") {
                if (!updatetriggered) {
                  triggerupdate = true;
                }
              } else {
                console.log("ok: "+data.split("\n")[0]);
                console.warn("Update available, but skipping since it's not running on Windows...");
                if (!loaded) {
                  $("#koyuspace-desktop").attr("style", "margin:0;padding:0;");
                  $("#koyuspace-desktop").html("<webview id=\"koyuspace-webview\" src=\"https://koyu.space\" style=\"width:100vw;height:98vh;\"></webview>");
                  loaded = true;
                }
              }
            }
          }).fail(function() {
            console.log("fail");
            $("#desktop__loading").attr("src", buncry);
            error = true;
            $("#notice").html("Error: No internet connection.");
          });
        }).fail(function() {
          $("#desktop__loading").attr("src", buncry);
          error = true;
          $("#notice").html("Error: No internet connection.");
        });
      }, 3000);
      window.setTimeout(function() {
        if (!error && !updatetriggered) {
          $("#desktop__loading").attr("src", buncry);
          error = true;
          $("#notice").html("Error: Timeout reached.");
        }
      }, 10000);
    });

    // Update notices every second and print errors in case
    window.setInterval(function() {
      var p = messages.length - 1;
      if (state>p) {
        state = 0;
      }
      if (!error && !updatetriggered) {
        $("#notice").html(messages[state - 1]);
      }
      state = state + 1;
    }, 1000);

    //Updater
    window.setInterval(function() {
      if (triggerupdate && !updatetriggered) {
        updatetriggered = true;
        console.log("update triggered");
        try {
          var url = "";
          var dest = localStorage.getItem("dlpath");
          if (process.platform === "win32") {
            url = "https://updates.koyu.space/desktop/desktop.exe";
          }/*  else {
            $("#desktop__loading").attr("src", buncry);
            $("#notice").html("Error: Can't run updates, please download the app <a href=\"https://updates.koyu.space/desktop/desktop.AppImage\" style=\"color:#fff\">here</a>.")
            error = true;
          } */
          // Updater has been disabled on Linux builds since Snaps are the favored way of distribution now
          if (!error) {
            $("#desktop__loading").attr("src", download_spinner);
            $("#notice").html("Downloading update...");
            var file = fs.createWriteStream(dest);
            var request = https.get(url, function(response) {
                response.pipe(file);
                file.on('finish', function() {
                    file.close(function() {
                      var exec = require('child_process').exec;
                      exec(dest);
                      window.setTimeout(function() {
                        exec("taskkill /IM koyu.space.exe /f");
                      }, 2000);
                    });
                });
            }).on('error', function(e) { // Handle errors
                fs.unlink(dest); // Delete the file async. (But we don't check the result)
                $("#desktop__loading").attr("src", buncry);
                $("#notice").html(e)
            });
          }
        } catch (e) {
          $("#desktop__loading").attr("src", buncry);
          $("#notice").html(e);
        }
      }
    }, 1000);
  }

  // Render main app
  render() {
    return (
    <div>
      <div style={{marginBottom: "-2px"}} id="titlebar">
        <TitleBar
          currentWindow={currentWindow} // electron window instance
          platform={process.platform} // win32, darwin, linux
          theme={{
            "bar": {
              "palette": "dark",
              "height": "28px",
              "color": "#fff",
              "background": "#222233"
            }
          }}
          title=""
          onClose={() => currentWindow.close()}
          onMinimize={() => currentWindow.minimize()}
          onMaximize={() => currentWindow.isMaximized() ? currentWindow.unmaximize() : currentWindow.maximize()}
          // when the titlebar is double clicked
          onDoubleClick={() => currentWindow.isMaximized() ? currentWindow.unmaximize() : currentWindow.maximize()}
        >
          {/* custom titlebar items */}
        </TitleBar>
      </div>
      <div id="koyuspace-desktop">
          <div className="container" style={{ padding: "20px", backgroundColor: "#223", borderRadius: "10px", maxWidth: "300px", maxHeight: "350px", textAlign: "center", margin: "0 auto", marginTop: "25vh" }} data-tid="container">
            <img src={spinner} id="desktop__loading" /><br /><br />
            <small id="notice" style={{ color: "#fff", fontFamily: "sans-serif" }}>Loading...</small>
          </div>
      </div>
    </div>
    );
  }
}
