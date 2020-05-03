/*global $*/
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

//Root sass file for webpack to compile
import './sass/main.scss';


class App extends Component {
  render() {
    return (<p>And so it begins...</p>)
  }
}

ReactDOM.render(<App />, document.getElementById('root'))

