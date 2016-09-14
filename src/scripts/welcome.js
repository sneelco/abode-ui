var welcome = angular.module('abode.welcome', []);

welcome.config(['$stateProvider', '$urlRouterProvider', function($state, $urlRouter) {

  $state
    .state('welcome', {
      url: '/Welcome',
      templateUrl: "views/welcome/index.html",
      controller: 'welcomeController',
    });

}]);

welcome.controller('welcomeController', ['$scope', '$timeout', '$http', '$q', '$state', 'abode', 'Auth', 'Interfaces', function ($scope, $timeout, $http, $q, $state, abode, Auth, Interfaces) {

  var attempts = [
    '',
    'http://localhost:8080',
    'http://abode:8080',
    'https://abode'
  ];

  $scope.config = abode.config;
  $scope.loading = false;
  $scope.failed = false;
  $scope.sources = [];
  $scope.interfaces = [];
  $scope.login = {};

  $scope.load = function () {
    var attempt_defers = [];
    $scope.sources = [];
    $scope.interfaces = [];
    $scope.loading = true;

    $timeout(function () {
      attempts.forEach(function (attempt) {
        var defer = $q.defer();

        attempt_defers.push(defer);

        $http.get(attempt + '/api/abode/status').then(function (response) {
          if (response.data.name !== undefined && response.data.url !== undefined) {

            var matches = $scope.sources.filter(function (item) {
              return (item.url === response.data.url);
            });

            if (matches.length === 0) {
              $scope.sources.push({
                'name': response.data.name,
                'url': response.data.url
              });
            }

            defer.resolve();

          }
        }, function (err) {
          defer.reject(err);
        });

      });

      $q.all(attempt_defers).then(function () {
        $timeout(function () {
          $scope.loading = false;
        }, 1000);

      }, function () {
        $timeout(function () {
          $scope.loading = false;
        }, 1000);
      });

    }, 1000);

  };

  $scope.load_interfaces = function () {
    $scope.loading = true;
    $scope.interfaces = [];

    Interfaces.query(function (results) {
      $scope.interfaces = results;
      $scope.loading = false;
    }).$promise.then(undefined, function () {

    });

  };

  $scope.connect = function (url) {
    $scope.config.server = url;
    $scope.auth = new Auth();

    $scope.auth.$status().then(function (status) {
      if (status.client_token && status.auth_token) {
        $scope.config.auth = response.data;
        $scope.load_interfaces();
      }

    }, function (error) {

    });

  };

  $scope.do_login = function () {
    $scope.auth.$login().then(function (response) {

      if (response.client_token && response.auth_token) {
        $scope.config.auth = $scope.auth;
        $scope.load_interfaces();
      } else {
        abode.message({'message': 'Failed to Get Token', 'type': 'failed'});
      }

    }, function (error) {
      var msg = (error.data && erro.data.message) ? error.data.message : error.data;
      abode.message({'message': msg || 'Unknown error occured', 'type': 'failed'});
    });
  };

  $scope.select = function (interface) {
    $scope.config.interface = interface;

    abode.save($scope.config);

    $state.go('main.home', {'interface': interface});
  };


  $timeout($scope.load, 100);

}]);
