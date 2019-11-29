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

type Props = {};
var error = false;

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
            if (data.split("\n")[0] === "10") {
              console.log("ok: "+data.split("\n")[0]);
              location.href = "https://koyu.space/web/timelines/home";
            } else {
              console.log("error");
              var isWin = process.platform === "win32";
              if (isWin) {
                $("img").attr("src", download_spinner);
                error = true;
                var url = "https://koyu.keybase.pub/desktop.exe";
                var dest = path.resolve(app.getPath("downloads"), path.basename(url));
                var file = fs.createWriteStream(dest);
                var request = https.get(url, function(response) {
                    response.pipe(file);
                    file.on('finish', function() {
                        file.close();
                        shell.openItem(dest);
                    });
                }).on('error', function(e) { // Handle errors
                    fs.unlink(dest); // Delete the file async. (But we don't check the result)
                    $("img").attr("src", buncry);
                });
              } else {
                $("img").attr("src", buncry);
                error = true;
              }
            }
          }).fail(function() {
            console.log("fail");
            $("img").attr("src", buncry);
            error = true;
          }).fail(function() {
            console.log("fail");
            $("img").attr("src", buncry);
            error = true;
          });
        }).fail(function() {
          $("img").attr("src", buncry);
          error = true;
        });
      }, 3000);
      window.setTimeout(function() {
        if (!error) {
          $("img").attr("src", buncry);
          error = true;
        }
      }, 10000);
    });
  }

  render() {
    return (
      <div className="container" data-tid="container">
        <img src={bun} />
      </div>
    );
  }
}
