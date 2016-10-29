var welcome = angular.module('abode.welcome', []);

welcome.config(['$stateProvider', '$urlRouterProvider', function($state, $urlRouter) {

  $state
    .state('welcome', {
      url: '/Welcome',
      templateUrl: "views/welcome/index.html",
      controller: 'welcomeController',
    })
    .state('welcome_login', {
      url: '/Welcome/Login',
      templateUrl: "views/welcome/login.html",
      controller: 'welcomeLoginController',
    })
    .state('welcome_devices', {
      url: '/Welcome/Devices',
      templateUrl: "views/welcome/devices.html",
      controller: 'welcomeDevicesController',
    })
    .state('welcome_interfaces', {
      url: '/Welcome/Interface',
      templateUrl: "views/welcome/interfaces.html",
      controller: 'welcomeInterfacesController',
    });

}]);

welcome.controller('welcomeController', ['$scope', '$timeout', '$http', '$q', '$state', 'abode', 'Auth', 'Interfaces', function ($scope, $timeout, $http, $q, $state, abode, Auth, Interfaces) {

  var attempts = [
    '',
    'http://localhost:8080',
    'http://abode:8080',
    'https://abode'
  ];

  abode.load();
  $scope.config = abode.config;
  $scope.loading = false;
  $scope.failed = false;
  $scope.sources = [];
  $scope.state = $state;
  $scope.auth = new Auth();

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

  $scope.connect = function (url) {
    $scope.config.server = url;
    abode.save($scope.config);

    $scope.auth.$check().then(function (status) {
      if (status.client_token && status.auth_token) {
        $scope.config.auth = response.data;
        abode.save($scope.config);
        $staet.go('welcome_devices');
      } else {
        abode.save($scope.config);
        $state.go('welcome_login');
      }

    }, function (error) {
      if (error.status === 401) {
        abode.save($scope.config);
        $state.go('welcome_login');
      }
      if (error.status === 403) {
        abode.save($scope.config);
        $state.go('welcome_devices');
      }
    });

  };


  $timeout($scope.load, 100);

}]);


welcome.controller('welcomeLoginController', ['$scope', '$timeout', '$http', '$q', '$state', 'abode', 'Auth', function ($scope, $timeout, $http, $q, $state, abode, Auth) {

  abode.load();
  $scope.config = abode.config;
  $scope.loading = false;
  $scope.failed = false;
  $scope.login = {};
  $scope.state = $state;
  $scope.auth = new Auth();

  $scope.do_login = function (supress) {
    loading = true;
    $scope.auth.$login().then(function (response) {
      loading = false;

      if (response.token) {
        $scope.config.auth = $scope.auth;
        abode.save($scope.config);
        $state.go('welcome_devices');
      } else {
        if (!supress) {
          abode.message({'message': 'Failed to Get Token', 'type': 'failed'});
        }
      }

    }, function (error) {
      loading = false;
      var msg = (error.data && error.data.message) ? error.data.message : error.data;
      if (!supress) {
        abode.message({'message': msg || 'Unknown error occured', 'type': 'failed'});
      }
    });
  };

  $scope.do_login(true);

}]);

welcome.controller('welcomeDevicesController', ['$scope', '$timeout', '$http', '$q', '$state', 'abode', 'AuthDevices', 'Auth', function ($scope, $timeout, $http, $q, $state, abode, AuthDevices, Auth) {

  abode.load();
  $scope.config = abode.config;
  $scope.loading = false;
  $scope.failed = false;
  $scope.interfaces = [];
  $scope.state = $state;
  $scope.device = new AuthDevices({'capabilities': ['client', 'browser'], 'provider': 'browser'});
  $scope.auth = new Auth(abode.config.auth);

  $scope.load_devices = function () {
    $scope.loading = true;
    $scope.devices = [];

    AuthDevices.query(function (results) {
      $scope.devices = results;
      $scope.loading = false;
    }).$promise.then(undefined, function () {
    });

  };

  $scope.select = function (device) {

    $scope.auth.$assign(device).then(function (result) {
      $state.go('welcome_interfaces');
    }, function (err) {
      abode.message({'message': err, 'type': 'failed'});
    });

    //$state.go('main.home', {'interface': interface});
  };

  $scope.create = function () {
    $scope.device.$save().then(function (data) {
      $state.go('welcome_interfaces');
    }, function (err) {
      abode.message({'message': err.data.message || err.data, 'type': 'failed'});
    });
  };

  $timeout($scope.load_devices, 100);

}]);

welcome.controller('welcomeInterfacesController', ['$scope', '$timeout', '$http', '$q', '$state', 'abode', 'Interfaces', 'AuthDevice', function ($scope, $timeout, $http, $q, $state, abode, Interfaces, AuthDevice) {

  abode.load();
  $scope.config = abode.config;
  $scope.loading = false;
  $scope.failed = false;
  $scope.interfaces = [];
  $scope.state = $state;
  $scope.interface = new Interfaces({'icon': 'icon-monitor', 'template': '<div></div>'});

  AuthDevice.get().$promise.then(function (record) {
    $scope.device = record;

    if (record.config && record.config.interface) {
      $scope.done(record.config.interface);
    } else {
      $timeout($scope.load_interfaces, 100);
    }
  }, function (err) {
    abode.message({'type': 'failed', 'message': err});
    $staet.go('welcome_devices');
  });

  $scope.load_interfaces = function () {
    $scope.loading = true;
    $scope.interfaces = [];

    Interfaces.query(function (results) {
      $scope.interfaces = results;
      $scope.loading = false;
    }).$promise.then(undefined, function () {
    });

  };

  $scope.done = function (interface) {
    $scope.config.interface = interface;

    abode.save($scope.config);

    $state.go('main.home', {'interface': interface});
  };

  $scope.select = function (interface) {

    $scope.device.$set_interface(interface).then(function () {
      $scope.done(interface);
    }, function (err) {
      abode.message({'type': 'failed', 'message': err});
    });

  };

  $scope.create = function () {
    $scope.interface.$save().then(function (data) {
      $scope.select(data.name);
    }, function () {
      console.dir(arguments);
    });
  };


}]);
