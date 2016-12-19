/*jslint node: true */
'use strict';

module.exports = function(grunt) {
  var server;
  var proxy = require('grunt-connect-proxy/lib/utils').proxyRequest;

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
          hostname: '0.0.0.0',
          keepalive: true,
          debug: true,
           middleware: function (connect, options, middlewares) {
            var httpProxy = require('http-proxy');
            var server_alive = true;
             
            var proxy = httpProxy.createProxyServer(options); // See (†) 
            proxy.on('error', function(e) {
              console.error('Could not proxy api endpoint');
              server_alive = false;
            });

            middlewares.unshift(function (req, res, next) {

              if (req.url.indexOf('/api') === 0 && server_alive) {
                proxy.web(req, res, { target: 'http://localhost:8080' });
                return;
              }

              next();
            });
             
            return middlewares;
          }
        },
        proxies: [
          {
            context: '/api',
            host: 'localhost',
            port: 8080,
            https: false,
            xforward: true,
          }
        ],
      },
    },
    concurrent: {
      dev: {
        tasks: ['watch:scripts', 'configureProxies:server', 'connect:server'],
        options: {
          logConcurrentOutput: true
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-connect-proxy');
  grunt.loadNpmTasks('grunt-contrib-connect');

  grunt.registerTask('default', ['jshint', 'concurrent:dev']);
};
