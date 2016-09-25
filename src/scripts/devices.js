var devices = angular.module('abode.devices', ['ui.router','ngResource']);

devices.config(function($stateProvider, $urlRouterProvider) {
  $urlRouterProvider.when('/devices', '/devices/list');

  $stateProvider
  .state('main.devices', {
    url: '/devices',
    templateUrl: '/views/devices/devices.html',
  })
  .state('main.devices.list', {
    url: '/list',
    templateUrl: '/views/devices/devices.list.html',
    controller: 'devicesList'
  })
  .state('main.devices.add', {
    url: '/add',
    templateUrl: '/views/devices/devices.add.html',
    controller: 'devicesAdd',
    resolve: {
      'providers': function ($q, $http) {
        var defer = $q.defer();

        $http.get('api/abode/providers').then(function (response) {
          defer.resolve(response.data);
        }, function (err) {
          defer.reject(err);
        });

        return defer.promise;
      },
      'capabilities': function ($q, $http) {
        var defer = $q.defer();

        $http.get('api/abode/capabilities').then(function (response) {
          defer.resolve(response.data);
        }, function (err) {
          defer.reject(err);
        });

        return defer.promise;
      }
    }
  })
  .state('main.devices.edit', {
    url: '/:name',
    templateUrl: '/views/devices/devices.edit.html',
    controller: 'devicesEdit',
    resolve: {
      'device': function ($stateParams, $state, abode, devices) {

        return devices.get($stateParams.name);

      },
      'providers': function ($q, $http, abode) {
        var defer = $q.defer();

        $http.get(abode.url('api/abode/providers').value()).then(function (response) {
          defer.resolve(response.data);
        }, function (err) {
          defer.reject(err);
        });

        return defer.promise;
      },
      'capabilities': function ($q, $http, abode) {
        var defer = $q.defer();

        $http.get(abode.url('api/abode/capabilities').value()).then(function (response) {
          defer.resolve(response.data);
        }, function (err) {
          defer.reject(err);
        });

        return defer.promise;
      }
    }
  });
});

devices.factory('Devices', ['$resource', '$http', '$q', 'abode', function($resource, $http, $q, abode) {

  var Devices = $resource(abode.url('/api/devices/:id'),{
    'id': '@_id'
  },{
    'update': {'method': 'PUT'},
  });

  Devices.prototype.$on = function () {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/devices/' + this._id + '/on').value();

    $http.post(url).then(function (response) {
      self._on = true;
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  Devices.prototype.$off = function () {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/devices/' + this._id + '/off').value();

    $http.post(url).then(function (response) {
      self._on = false;
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  Devices.prototype.$open = function () {

  };

  return Devices;

}]);

devices.service('devices', function ($q, $http, $uibModal, $rootScope, $timeout, $resource, abode) {
  var model = $resource(abode.url('/api/devices/:id/:action'), {id: '@_id'}, {
    'update': { method: 'PUT' },
    'on': { method: 'POST', params: {'action': 'on'}},
    'off': { method: 'POST', params: {'action': 'off'}}
  });
  var devices = {};

  $rootScope.$on('DEVICE_CHANGE', function (event, args) {

    args.source = args.source || 'local';
    setDevice(args.object, args.source);


    //console.log('Device event from %s: %s', args.source, args.object.name);
  });

  var get_by_name = function (name, source) {
    var found;

    source = source || 'local';

    if (!devices[source]) {
      return;
    }

    if (devices[source][name]) {
      return devices[source][name];
    }

    Object.keys(devices[source]).forEach(function (id) {
      if (devices[source][id].name === name) {
        found = devices[source][id];
      }
    });

    return found;
  };

  var makeAges = function (device) {

    if (device._on === true) {
      device.age = new Date() - new Date(device.last_on);
    } else {
      device.age = new Date() - new Date(device.last_off);
    }

    if (!isNaN(device.age)) {
      device.age = device.age / 1000;
    } else {
      device.age = 0;
    }

    return device;
  };

  var setDevice = function (device, source) {

    source = source || 'local';

    if (device._on === true) {
      device.age = new Date() - new Date(device.last_on);
    } else {
      device.age = new Date() - new Date(device.last_off);
    }

    if (!isNaN(device.age)) {
      device.age = device.age / 1000;
    } else {
      device.age = 0;
    }

    if (!devices[source]) { devices[source] = {}; }
    if (!devices[source][device._id]) {
      devices[source][device._id] = {};
    }

    Object.keys(device).forEach(function (key) {
      devices[source][device._id][key] = device[key];
    });

    return devices[source][device._id];

  };

  var getDevice = function (device, source, force) {
    var defer = $q.defer();
    var req_timeout;
    var source_uri = (source === undefined) ? '/api' : '/api/sources/' + source;

    var config = {
      'method': 'GET',
      'url': source_uri + '/devices/' + device,
      'timeout': 9000
    };

    model.get({'source': source, 'id': device}).$promise.then(function (result) {
      result.source = source;
      source = source || 'local';
      $timeout.cancel(req_timeout);

      result.$open = function () {
        return openDevice(device, source);
      };

      setDevice(result, source );

      defer.resolve(devices[source][result._id]);
    }, function (err) {
      $timeout.cancel(req_timeout);
      defer.reject(err);
    });

    req_timeout = $timeout(function () {
      defer.reject('Request timed out');
    }, 10000);

    return defer.promise;
  };

  var load = function (source) {
    var defer = $q.defer();

    model.query({'source': source}).$promise.then(function (results) {
      var devs = [];
      results.forEach(function (device) {
        devs.push(setDevice(device, source));
      });

      defer.resolve(devs);
    }, function (err) {
      defer.reject(err);
    });
    return defer.promise;
  };

  var openCamera = function (device, source) {
    return $uibModal.open({
      animation: true,
      templateUrl: 'views/devices/devices.camera.html',
      size: 'lg',
      controller: function ($scope, $uibModalInstance) {
        var source_uri = (source === undefined) ? '/api' : '/api/sources/' + source;

        $scope.device = device;

        $scope.ok = function () {
          $uibModalInstance.close();
        };

        if (device.config.video_url) {
          $scope.camera_url = source_uri + '/devices/' + device._id + '/video';
        } else {
          $scope.camera_url = source_uri + '/devices/' + device._id + '/image';
        }
      }
    });
  };

  var openDevice =function (device, source) {

    return $uibModal.open({
      animation: true,
      templateUrl: 'views/devices/devices.view.html',
      size: 'sm',
      controller: function ($scope, $uibModalInstance, $interval, $timeout, $state, device, source) {
        var intervals = [];
        var source_uri = (source === undefined) ? '/api' : '/api/sources/' + source;

        $scope.device = angular.copy(device);
        $scope.processing = false;
        $scope.errors = false;
        $scope.source = source;
        $scope.capabilities = angular.copy(device.capabilities).map(function (c) {
          return {
            'name': c,
            'view': 'views/devices/capabilities/' + c + '.html'
          };

        });

        $scope.edit = function () {
          $uibModalInstance.close({'recurse': true});
          $state.go('index.devices.edit', {'name': device.name});
        };

        $scope.sensors = $scope.capabilities.filter(function (c) {

          return (c.name.indexOf('_sensor') > -1);

        });

        $scope.controls = $scope.capabilities.filter(function (c) {

          return (c.name.indexOf('_sensor') === -1);

        });

        $scope.openVideo = function (device) {
          openCamera(device, source);
        };

        $scope.has_capability = function (capability) {
          var match = $scope.capabilities.filter(function (c) {

            return (c.name === capability);

          });

          return (match.length > 0);
        };

        $scope.name = device.name;

        $scope.reload = function () {

          $scope.processing = true;
          $scope.errors = false;

          if ($scope.device.active === false) {
            getDevice(source, $scope.device.name, true).then(function (device) {
              $scope.device = device;
            }, function () {
              $scope.processing = false;
              $scope.errors = true;
            });
          } else {
            $http.post(source_uri + '/devices/' + $scope.device.name + '/status').then(function (response) {
              var src_key = source || 'local';
              if (response.data.device) {

                devices[src_key][response.data.device._id] = makeAges(response.data.device);
                devices[src_key][response.data.device._id].$updated = new Date();
                $scope.device = devices[source || 'local'][response.data.device._id];
              }
              $scope.processing = false;
              $scope.errors = false;
            }, function () {
              $scope.processing = false;
              $scope.errors = true;
            });
          }

        };

        $scope.ok = function () {
          $uibModalInstance.close();
        };


        $scope.toggle_onoff = function () {

          $scope.processing = true;
          $scope.errors = false;

          if ($scope.device.active === false) {
            if ($scope.device._on) {
              $http.put(source_uri + '/devices/' + $scope.device.name, {'_on': false}).then(function () {
                $scope.processing = false;
                $scope.errors = false;
              }, function (err) {
                console.log(err);
                $scope.processing = false;
                $scope.errors = true;
              });
            } else {
              $http.put(source_uri + '/devices/' + $scope.device.name, {'_on': true}).then(function () {
                $scope.processing = false;
                $scope.errors = false;
              }, function (err) {
                console.log(err);
                $scope.processing = false;
                $scope.errors = true;
              });
            }
          } else {
            if ($scope.device._on) {
              $http.post(source_uri + '/devices/' + $scope.device.name + '/off').then(function () {
                $scope.processing = false;
                $scope.errors = false;
              }, function (err) {
                console.log(err);
                $scope.processing = false;
                $scope.errors = true;
              });
            } else {
              $http.post(source_uri + '/devices/' + $scope.device.name + '/on').then(function () {
                $scope.processing = false;
                $scope.errors = false;
              }, function (err) {
                console.log(err);
                $scope.processing = false;
                $scope.errors = true;
              });
            }
          }
        };

        $scope.set_mode = function (mode) {

          $scope.processing = true;
          $scope.errors = false;

          $http.post(source_uri + '/devices/' + $scope.device.name + '/set_mode', [mode]).then(function (response) {
            if (response.data.device) {
              $scope.device = response.data.device;
            }
            $scope.processing = false;
            $scope.errors = false;
          }, function (err) {
            console.log(err);
            $scope.processing = false;
            $scope.errors = true;
          });
        };

        var temp_wait;

        $scope.temp_up = function () {
          $scope.processing = true;
          $scope.errors = false;
          if (temp_wait) {
            $timeout.cancel(temp_wait);
          }
          $scope.device._set_point += 1;

          temp_wait = $timeout($scope.set_temp, 2000);
        };

        $scope.temp_down = function () {
          $scope.processing = true;
          $scope.errors = false;
          if (temp_wait) {
            $timeout.cancel(temp_wait);
          }
          $scope.device._set_point -= 1;

          temp_wait = $timeout($scope.set_temp, 2000);
        };

        $scope.set_temp = function () {

          $scope.processing = true;
          $scope.errors = false;

          $http.post(source_uri + '/devices/' + $scope.device.name + '/set_point', [$scope.device._set_point]).then(function (response) {
            if (response.data.device) {
              $scope.device = response.data.device;
            }
            temp_wait = undefined;
            $scope.processing = false;
            $scope.errors = false;
          }, function () {
            temp_wait = undefined;
            $scope.processing = false;
            $scope.errors = true;
          });
        };

        var level_wait;

        $scope.level_up = function () {
          $scope.processing = true;
          $scope.errors = false;
          if (level_wait) {
            $timeout.cancel(level_wait);
          }
          if ($scope.device._level < 100){
            $scope.device._level += 1;
          }

          level_wait = $timeout($scope.set_level, 2000);
        };

        $scope.level_down = function () {
          $scope.processing = true;
          $scope.errors = false;
          if (level_wait) {
            $timeout.cancel(level_wait);
          }

          if ($scope.device._level > 0){
            $scope.device._level -= 1;
          }

          level_wait = $timeout($scope.set_level, 2000);
        };

        $scope.set_level = function () {

          $scope.processing = true;
          $scope.errors = false;

          $http.post(source_uri + '/devices/' + $scope.device.name + '/set_level', [$scope.device._level]).then(function (response) {
            if (response.data.device) {
              $scope.device = response.data.device;
            }
            level_wait = undefined;
            $scope.processing = false;
            $scope.errors = false;
          }, function () {
            level_wait = undefined;
            $scope.processing = false;
            $scope.errors = true;
          });
        };

        var device_checker = function () {
          if (temp_wait || level_wait) {
            return;
          }
          getDevice($scope.device.name, source).then(function (response) {
            $scope.device = response;
          });
        };

        intervals.push($interval(device_checker, 2000));

        $scope.$on('$destroy', function () {
          intervals.forEach($interval.cancel);
        });
      },
      resolve: {
        device: function () {
          if (typeof device === 'object') {
            return device;
          } else {
            return getDevice(device, source);
          }
        },
        source: function () {
          return source;
        },
      }
    });

  };

  var addDevice = function (config) {
    var defer = $q.defer();

    $http.post('/api/devices', config).then(function (response) {
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var saveDevice = function (device) {
    var defer = $q.defer();

    $http.put('/api/devices/' + device._id, device).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var removeDevice = function (device) {
    var defer = $q.defer();

    $http.delete('/api/devices/' + device).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var getDeviceRooms = function (device) {
    var defer = $q.defer();

    $http({ url: '/api/devices/' + device + '/rooms'}).then(function (response) {
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var addDeviceRoom = function (device, room) {
    var defer = $q.defer();

    $http.post('/api/devices/' + device + '/rooms', {'name': room}).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var removeDeviceRoom = function (device, room) {
    var defer = $q.defer();

    $http.delete('/api/devices/' + device + '/rooms/' + room).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  return {
    'load': load,
    'set': setDevice,
    'add': addDevice,
    'view': openDevice,
    'get': getDevice,
    'save': saveDevice,
    'remove': removeDevice,
    'getRooms': getDeviceRooms,
    'addRoom': addDeviceRoom,
    'removeRoom': removeDeviceRoom,
    'openDevice': openDevice,
    'openCamera': openCamera
  };
});

devices.controller('devicesList', function ($scope, $state, devices) {
  $scope.devices = [];
  $scope.loading = true;

  $scope.view = function (device) {
    devices.openDevice(device.name);
  };

  $scope.edit = function (device) {
    $state.go('main.devices.edit', {'name': device.name});
  };

  $scope.load = function () {
    devices.load().then(function (devices) {
      $scope.devices = devices;
      $scope.loading = false;
      $scope.error = false;
    }, function () {
      $scope.loading = false;
      $scope.error = true;
    });
  };

  $scope.has_capability = function (device, cap) {
    return (device.capabilities.indexOf(cap) !== -1);
  };

  $scope.load();
});

devices.controller('devicesEdit', function ($scope, $state, $uibModal, notifier, devices, device, confirm, providers, capabilities) {
  $scope.providers = providers;
  $scope.capabilities = capabilities;
  $scope.device = device;
  $scope.alerts = [];
  $scope.rooms = [];
  $scope.loading = false;
  $scope.section = 'provider';
  $scope.provider_template = '/views/providers/' + device.provider + '/edit.html';

  if (!device) {
    $state.go('index.devices.list');
  }

  var getRooms = function () {
    $scope.loading = true;
    devices.getRooms(device.name).then(function(rooms) {
      $scope.rooms = rooms;
      $scope.loading = false;
    }, function () {
      $scope.loading = false;
    });
  };

  getRooms();

  $scope.back = function () {
    $state.go('index.devices');
  };

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

  $scope.save = function () {
    devices.save($scope.device).then(function () {
      notifier.notify({'status': 'success', 'message': 'Device Saved'});
    }, function (err) {
        notifier.notify({'status': 'failed', 'message': 'Failed to save Device', 'details': err});
      $scope.errors = err;
    });
  };

  $scope.remove = function () {
    confirm('Are you sure you want to remove this Device?').then(function () {
      devices.remove(device._id).then(function () {
        notifier.notify({'status': 'success', 'message': 'Device Removed'});
        $state.go('index.devices');
      }, function (err) {
        notifier.notify({'status': 'failed', 'message': 'Failed to remove Device', 'details': err});
        $scope.errors = err;
      });
    });
  };

  $scope.removeRoom = function (id) {

    confirm('Are you sure?').then(function () {
      devices.removeRoom(device.name, id).then(function () {
        getRooms();
        notifier.notify({'status': 'success', 'message': 'Room removed from Device'});
      }, function () {
        notifier.notify({'status': 'failed', 'message': 'Failed to remove Room from Device', 'details': err});
      });
    });

  };

  $scope.addRoom = function () {
    var assign = $uibModal.open({
      animation: true,
      templateUrl: 'views/devices/assign.html',
      size: 'sm',
      resolve: {
        assigned: function () {
          return $scope.rooms.map(function (obj) {return obj.name; });
        }
      },
      controller: function ($scope, $uibModalInstance, rooms, assigned) {
        $scope.loading = true;
        $scope.rooms = [];
        $scope.assigned = assigned;

        $scope.cancel = function () {
          $uibModalInstance.dismiss();
        };

        $scope.select = function (room) {
          $uibModalInstance.close(room);
        };

        $scope.load = function () {
          rooms.load().then(function (rooms) {
            $scope.rooms = rooms;
            $scope.loading = false;
            $scope.error = false;
          }, function () {
            $scope.loading = false;
            $scope.error = true;
          });
        };

        $scope.load();

      }
    });

    assign.result.then(function (room) {

      devices.addRoom(device.name, room.name).then(function () {
        getRooms();
        notifier.notify({'status': 'success', 'message': 'Room added to Device'});
      }, function () {
        notifier.notify({'status': 'failed', 'message': 'Failed to add Room to Device', 'details': err});
      });

    });

  };

  $scope.toggle_capability = function (capability) {
    if ($scope.has_capability(capability)) {
      console.log('removing', capability);
      $scope.device.capabilities.splice($scope.device.capabilities.indexOf(capability), 1);
    } else {
      console.log('adding', capability);
      $scope.device.capabilities.push(capability);
    }
  };

  $scope.has_capability = function (capability) {
    return ($scope.device.capabilities.indexOf(capability) !== -1);
  };

});

devices.controller('devicesAdd', function ($scope, $state, notifier, devices, providers, capabilities) {
  $scope.device = {'capabilities': []};
  $scope.alerts = [];
  $scope.providers = providers;
  $scope.capabilities = capabilities;
  $scope.section = 'provider';
  $scope.provider_templates = {};

  $scope.providers.forEach(function (p) {
    $scope.provider_templates[p] = '/views/providers/' + p + '/add.html';
  });

  $scope.back = function () {
    $state.go('index.devices');
  };

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

  $scope.changeProvider = function (p) {
    $scope.device.provider = p;
    $scope.section = 'settings';
    $scope.provider_template = '/views/providers/' + p + '/add.html';
  };

  $scope.add = function () {
    devices.add($scope.device).then(function () {
      notifier.notify({'status': 'success', 'message': 'Device Added'});
      $scope.device = {'capabilities': []};
      $scope.section = 'provider';
    }, function (err) {
        notifier.notify({'status': 'failed', 'message': 'Failed to add Device', 'details': err});
      $scope.errors = err;
    });
  };

  $scope.toggle_capability = function (capability) {
    if ($scope.has_capability(capability)) {
      console.log('removing', capability);
      $scope.device.capabilities.splice($scope.device.capabilities.indexOf(capability), 1);
    } else {
      console.log('adding', capability);
      $scope.device.capabilities.push(capability);
    }
  };

  $scope.has_capability = function (capability) {
    return ($scope.device.capabilities.indexOf(capability) !== -1);
  };
});

devices.directive('device', function () {

  return {
    restrict: 'E',
    transclude: true,
    scope: {      device: '@'
    },
    controller: function ($scope, device) {

      $scope.device = device.get($scope.device);

    },
    template: '<div>{{device.name}}</div>',
    replace: true,
  };

});
