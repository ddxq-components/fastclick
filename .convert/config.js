'use strict';

var path = require('path');

module.exports = {
  orgiRepo: 'ftlabs/fastclick',
  ref: 'v1.0.6',
  target: path.resolve(__dirname, '..'),

  name: 'fastclick',
  repo: 'ddxq-components/fastclick',
  keywords: ['fastclick'],
  description: 'convert from [ftlabs/fastclick]',
  main: {
    'fastclick.js': 'lib/fastclick.js'
  }
};