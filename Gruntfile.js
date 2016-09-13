/*jslint node: true */
'use strict';

module.exports = function(grunt) {
  var server;

  grunt.initConfig({
    watch: {
      scripts: {
        files: ['Gruntfile.js', 'src/scripts/**/*.js'],
        tasks: ['jshint'],
        options: {
          interrupt: true,
          livereload: true,
        },
      },
    },
    jshint: {
      options: {
        force: true,
      },
      files: ['Gruntfile.js', 'src/scripts/**/*.js']
    },
    connect: {
      server: {
        options: {
          base: 'src',
          port: 8000,
          useAvailablePort: true,
          open: true,
          hostname: 'localhost',
          keepalive: true,
          debug: true
        }
      }
    },
    concurrent: {
      dev: {
        tasks: ['watch:scripts', 'connect'],
        options: {
          logConcurrentOutput: true
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');

  grunt.registerTask('default', ['jshint', 'concurrent:dev']);
};
