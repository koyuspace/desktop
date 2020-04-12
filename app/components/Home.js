// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import routes from '../constants/routes';
import './Home.css';
import spinner from './loading.svg';
import buncry from './buncry.png';
import download_spinner from './download.svg';
import logo from './logo.png';
import $ from 'jquery';

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
            if (data.split("\n")[0] === "23") {
              console.log("ok: "+data.split("\n")[0]);
              location.href = "https://koyu.space/web/timelines/home";
            } else {
              //Updater
              if (!updatetriggered) {
                triggerupdate = true;
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
            url = "https://koyu.keybase.pub/desktop.exe";
          } else {
            $("#desktop__loading").attr("src", buncry);
            $("#notice").html("Error: Can't run updates, please download the app <a href=\"https://koyu.keybase.pub/desktop.AppImage\" style=\"color:#fff\">here</a>.")
            error = true;
          }
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
	    <img src={logo} height="64" />
        <div className="container" style={{ padding: "20px", backgroundColor: "#223", borderRadius: "10px", maxWidth: "300px", maxHeight: "350px", textAlign: "center", margin: "0 auto", marginTop: "25vh" }} data-tid="container">
          <img src={spinner} id="desktop__loading" /><br /><br />
          <small id="notice" style={{ color: "#fff", fontFamily: "sans-serif" }}>Loading...</small>
        </div>
	  </div>
    );
  }
}
