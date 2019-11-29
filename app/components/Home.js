// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import routes from '../constants/routes';
import styles from './Home.css';
import bun from './bun.png';
import buncry from './buncry.png';
import download_spinner from './download.svg'
import $ from 'jquery';

var shell = require('electron').shell;
var fs = require('fs');
var https = require('https');
var path = require('path');
var app = require('electron').app;

type Props = {};
var error = false;
var triggerupdate = false;
var updatetriggered = false;
var messages = ["Bunning...", "Planning tea-party...", "Speaking German...", "Waiting for the train...", "Hopping...", "Talking to servers..."];
var state = 0;

window.addEventListener('online', function() {
  window.setTimeout(function() {
    error = false;
  }, 10000);
});

export default class Home extends Component<Props> {
  props: Props;

  componentDidMount() {
    $(document).ready(function() {
      window.setInterval(function() {
        $.get("https://koyu.space/api/v1/instance", function() {
          $.get("https://updates.koyu.space/desktop/latest?_=" + new Date().getTime(), function(data) {
            if (data.split("\n")[0] === "11") {
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
            $("img").attr("src", buncry);
            error = true;
            $("#notice").html("Error: No internet connection.");
          });
        }).fail(function() {
          $("img").attr("src", buncry);
          error = true;
          $("#notice").html("Error: No internet connection.");
        });
      }, 3000);
      window.setTimeout(function() {
        if (!error && !updatetriggered) {
          $("img").attr("src", buncry);
          error = true;
          $("#notice").html("Error: Timeout reached.");
        }
      }, 10000);
    });

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
            $("img").attr("src", buncry);
            $("#notice").html("Error: Can't run updates, please download the app <a href=\"https://koyu.keybase.pub/desktop.AppImage\" style=\"color:#fff\">here</a>.")
            error = true;
          }
          if (!error) {
            $("img").attr("src", download_spinner);
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
                $("img").attr("src", buncry);
                $("#notice").html(e)
            });
          }
        } catch (e) {
          $("img").attr("src", buncry);
          $("#notice").html(e);
        }
      }
    }, 1000);
  }

  render() {
    return (
      <div className="container" data-tid="container">
        <img src={bun} /><br /><br />
        <small id="notice" style={{ color: "#fff", fontFamily: "sans-serif" }}>Loading buns...</small>
      </div>
    );
  }
}
