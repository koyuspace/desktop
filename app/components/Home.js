// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import routes from '../constants/routes';
import styles from './Home.css';
import bun from './bun.png';
import buncry from './buncry.png';
import $ from 'jquery';

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
            if (data.split("\n")[0] === "4") {
              console.log("ok: "+data.split("\n")[0]);
              location.href = "https://koyu.space/web/timelines/home";
            } else {
              console.log("error");
              $("img").attr("src", buncry);
              error = true;
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
        $("img").attr("src", buncry);
        error = true;
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
