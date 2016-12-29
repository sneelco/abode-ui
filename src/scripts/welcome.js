var welcome = angular.module('abode.welcome', []);

welcome.config(['$stateProvider', '$urlRouterProvider', function($state, $urlRouter) {

  $state
    .state('welcome', {
      url: '/Welcome',
      templateUrl: "views/welcome/index.html",
      controller: 'welcomeController',
    })
    .state('welcome_configure', {
      url: '/Welcome/Configure',
      templateUrl: "views/welcome/configure.html",
      controller: 'welcomeConfigureController',
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
      resolve: {
        'rad': ['$q', '$http', function ($q, $http) {
          var defer = $q.defer();

          $http.get('/api/abode/status').then(function (response) {
            defer.resolve(response.data);
          }, function () {
            defer.resolve();
          });

          return defer.promise;
        }]
      }
    })
    .state('welcome_interfaces', {
      url: '/Welcome/Interface',
      templateUrl: "views/welcome/interfaces.html",
      controller: 'welcomeInterfacesController',
    });

}]);

welcome.controller('welcomeController', ['$scope', '$timeout', '$interval', '$http', '$q', '$state', 'abode', 'Auth', 'Interfaces', function ($scope, $timeout, $interval, $http, $q, $state, abode, Auth, Interfaces) {

  var ssl_checker;
  var attempts = [
    '',
    'http://abode:8080',
    'https://abode'
  ];

  abode.load();
  $scope.config = abode.config;
  if ($scope.config.server) {
    $state.go('welcome_login');
  }
  $scope.loading = false;
  $scope.failed = false;
  $scope.sources = [];
  $scope.state = $state;
  $scope.checking_ssl = false

  $scope.load = function () {
    var attempt_defers = [];
    $scope.sources = [];
    $scope.interfaces = [];
    $scope.loading = true;

    $timeout(function () {

      $http.get('/api/abode/status').then(function (response) {
        if (response.data.name !== undefined && response.data.url !== undefined) {

          $scope.sources.push({
            'name': response.data.name,
            'url': response.data.url,
            'ssl_url': response.data.ssl_url,
            'mode': response.data.mode,
            'ca_url': response.data.ca_url,
          });

          $http.get('/api/abode/upnp').then(function (response) {
            $scope.sources.push.apply($scope.sources, response.data);
            $scope.loading = false;
          }, function () {
            $scope.loading = false;
          });

        } else {
          $scope.loading = false;
        }
      }, function (err) {
        $scope.loading = false;
      });

    }, 100);

  };

  $scope.cancel_check = function () {
    if (ssl_checker) {
      $timeout.cancel(ssl_checker);
    }
    $scope.checking_ssl = false;
    $scope.checking = false;
  };

  $scope.connect = function (source) {
    if (source.mode === 'device') {
      $state.go('welcome_configure');
      return;
    }

    var check_server = function () {

      abode.config.server = source.url;
      abode.config.auth = {};
      abode.save(abode.config);

      $scope.auth = new Auth();
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
        } else if (error.status === 403) {
          abode.save($scope.config);
          $state.go('welcome_devices');
        } else {
          abode.message({'type': 'failed', 'message': 'Failed to connect'});
        }
      });

    };

    var check_cert = function (status) {
      var check_count = 0

      var check_ssl = function () {
        $scope.checking_ssl = true;
        check_count += 1;

        $http.get(status.ssl_url + '/api/abode/status').then(function () {
          abode.config.server = status.ssl_url;
          abode.save(abode.config);

          $scope.checking_ssl = false;
          check_server();
        }, function (err) {
          $scope.checking_ssl = false;
          if (check_count > 10) {
            $scope.checking = false;
            abode.message({'type': 'failed', 'message': 'Timeout waiting for CA to be installed'});
          } else {
            $timeout(check_ssl, 2000);
          }
        })
      };

      //If a SSL URL and a CA_URL are specified, 
      if (status.ssl_url && status.ca_url) {
        check_ssl();

        //If we are on localhost, try to import the cert transparently
        if (document.location.host.indexOf('localhost') >= 0) {
          $http.post('/api/abode/import_ca', {'ca_url': status.ca_url}).then(function () {
          }, function () {
          });
        //Otherwise prompt to download the certificate
        } else {
            var dl_link = document.createElement('A');
            dl_link.href = status.ca_url;
            dl_link.style.display = 'none';
            document.body.appendChild(dl_link);
            dl_link.click();
        }
      } else {
        check_server();
      }
    };

    //Get the status of the selected server
    $scope.checking = true;
    var url = source.url + '/api/abode/status';
    $http.get(url).then(function (response) {
      //Check for a certificate
      check_cert(response.data);
    }, function () {
      abode.message({'type': 'failed', 'message': 'Could not get server status'});
    });

  };


  $timeout($scope.load, 100);

}]);

welcome.controller('welcomeConfigureController', ['$scope', '$state', function ($scope, $state) {

}]);

welcome.controller('welcomeLoginController', ['$scope', '$timeout', '$http', '$q', '$state', 'abode', 'Auth', function ($scope, $timeout, $http, $q, $state, abode, Auth) {

  abode.load();
  $scope.config = abode.config;
  $scope.loading = false;
  $scope.failed = false;
  $scope.login = {};
  $scope.state = $state;
  $scope.auth = new Auth();
  $scope.checking_login = true;

  $scope.reset_server = function () {
    abode.save({});
    $state.go('welcome');
  };

  $scope.do_login = function (supress) {
    loading = true;
    $scope.auth.$login().then(function (response) {
      loading = false;
      $scope.checking_login = false;

      if (response.token) {
        $scope.config.auth = $scope.auth;
        abode.save($scope.config);
        $state.go('welcome_devices');
      } else {
        $scope.checking_login = false;
        if (!supress) {
          abode.message({'message': 'Failed to Get Token', 'type': 'failed'});
        }
      }

    }, function (error) {
      loading = false;
      $scope.checking_login = false;

      var msg = (error.data && error.data.message) ? error.data.message : error.data;
      if (!supress) {
        abode.message({'message': msg || 'Unknown error occured', 'type': 'failed'});
      }
    });
  };

  $scope.do_login(true);

}]);

welcome.controller('welcomeDevicesController', ['$scope', '$timeout', '$http', '$q', '$state', 'abode', 'AuthDevices', 'Auth', 'rad', function ($scope, $timeout, $http, $q, $state, abode, AuthDevices, Auth, rad) {

  abode.load();
  $scope.config = abode.config;
  $scope.loading = false;
  $scope.failed = false;
  $scope.interfaces = [];
  $scope.state = $state;
  $scope.rad = rad;

  $scope.add_rad = ($scope.rad && $scope.rad.mode === 'device') ? true : false;

  $scope.device = new AuthDevices({'capabilities': ['client', 'browser'], 'provider': 'browser'});
  $scope.auth = new Auth(abode.config.auth);

  $scope.reset_server = function () {
    abode.save({});
    $state.go('welcome');
  };

  $scope.deviceFilter = function () {
    return function( item ) {
      if ($scope.add_rad) {
        return (item.provider === 'rad');
      } else {
        return (item.provider === 'browser');
      }
    };
  };

  $scope.load_devices = function () {
    $scope.loading = true;
    $scope.devices = [];

    AuthDevices.query().$promise.then(function (results) {
      $scope.devices = results;
      $scope.loading = false;
      $scope.failed = false;
    }, function (err) {
      $scope.loading = false;
      $scope.failed = true;
      console.error(err);
    });

  };

  $scope.select = function (device) {
    if ($scope.add_rad) {
      device.capabilities.push.apply(device.capabilities, rad.capabilities);
      device.config = device.config || {};
      device.config.address = rad.url;
    }

    $scope.auth.$assign(device).then(function (result) {
      $state.go('welcome_interfaces');
    }, function (err) {
      abode.message({'message': err.message || 'Error Occured', 'type': 'failed'});
    });

    //$state.go('main.home', {'interface': interface});
  };

  $scope.create = function () {
    if ($scope.add_rad) {
      $scope.device.provider = 'rad';
      $scope.device.capabilities.push.apply($scope.device.capabilities, rad.capabilities);
      $scope.device.config = $scope.device.config || {};
      $scope.device.config.address = rad.url;
    } else {
      $scope.device.capabilities = ['client', 'browser'];
      $scope.device.provider = 'browser';
      $scope.device.config = {};
    }

    $scope.device.$save().then(function (data) {
      $state.go('welcome_interfaces');
    }, function (err) {
      abode.message({'message': err.data.message || err.data.errmsg || err.data, 'type': 'failed'});
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
  $scope.checking_device = true;
  $scope.interface = new Interfaces({'icon': 'icon-monitor', 'template': '<div></div>'});

  AuthDevice.get().$promise.then(function (record) {
    $scope.device = record;

    if (record.config && record.config.interface) {
      $scope.done(record.config.interface);
    } else {
      $scope.checking_device = false;
      $timeout($scope.load_interfaces, 100);
    }
  }, function (err) {
    $scope.checking_device = false;
    abode.message({'type': 'failed', 'message': err});
      console.error(err);
    $state.go('welcome_devices');
  });

  $scope.reset_server = function () {
    abode.save({});
    $state.go('welcome');
  };

  $scope.load_interfaces = function () {
    $scope.loading = true;
    $scope.interfaces = [];

    Interfaces.query(function (results) {
      $scope.interfaces = results;
      $scope.loading = false;
    }).$promise.then(undefined, function () {
      $scope.loading = false;
      abode.message({'type': 'failed', 'message': 'Failed to load interfaces'});
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
      abode.message({'type': 'failed', 'message': err.message || err});
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
