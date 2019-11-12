// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import routes from '../constants/routes';
import styles from './Home.css';
import buncry from './buncry.png';
import $ from 'jquery';

type Props = {};

export default class Home extends Component<Props> {
  props: Props;

  componentDidMount() {
    $(document).ready(function() {
      window.setInterval(function() {
        $.get("https://koyu.space/api/v1/instance", function() {
          $.get("https://updates.koyu.space/desktop/latest", function() {
          }).fail(function() {
            console.log("fail");
            $("img").attr("style", "");
          }).done(function(data) {
            if (data.split("\n")[0] === "1") {
              console.log("ok");
              location.href = "https://koyu.space/web/timelines/home";
            } else {
              console.log("error");
              $("img").attr("style", "");
            }
          });
        }).fail(function() {
          $("img").attr("style", "");
        });
      }, 500);
    });
  }

  render() {
    return (
      <div className="container" data-tid="container">
        <img style={{"display": "none"}} src={buncry} />
      </div>
    );
  }
}
