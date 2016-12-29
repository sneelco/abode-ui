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
      'providers': function ($q, $http, abode) {
        var defer = $q.defer();

        $http.get(abode.url('/api/abode/providers').value()).then(function (response) {
          defer.resolve(response.data);
        }, function (err) {
          defer.reject(err);
        });

        return defer.promise;
      },
      'capabilities': function ($q, $http, abode) {
        var defer = $q.defer();

        $http.get(abode.url('/api/abode/capabilities').value()).then(function (response) {
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
      'device': function ($stateParams, $state, abode, Devices) {

        return Devices.get({'id': $stateParams.name}).$promise;

      },
      'providers': function ($q, $http, abode) {
        var defer = $q.defer();

        $http.get(abode.url('/api/abode/providers').value()).then(function (response) {
          defer.resolve(response.data);
        }, function (err) {
          defer.reject(err);
        });

        return defer.promise;
      },
      'capabilities': function ($q, $http, abode) {
        var defer = $q.defer();

        $http.get(abode.url('/api/abode/capabilities').value()).then(function (response) {
          defer.resolve(response.data);
        }, function (err) {
          defer.reject(err);
        });

        return defer.promise;
      }
    }
  });
});

devices.factory('RoomDevices', ['$resource', 'abode', 'devices', function ($resource, abode, devices) {

  var model = $resource(abode.url('/api/rooms/:room/devices/:id'), {id: '@_id'}, {
    'query': {
      isArray: true,
      transformResponse: [
        function (data, headers, status) {
          data = angular.fromJson(data);

          data.forEach(function (dev) {
            if (dev._on === true) {
              dev.age = new Date() - new Date(dev.last_on);
            } else {
              dev.age = new Date() - new Date(dev.last_off);
            }

            if (!isNaN(dev.age)) {
              dev.age = dev.age / 1000;
            } else {
              dev.age = 0;
            }
          });

          return data;
        }
      ]
    }
  });

  angular.merge(model.prototype, devices.methods);

  return model;

}]);

devices.factory('DeviceRooms', ['$resource', 'abode', function ($resource, abode) {

  var model = $resource(abode.url('/api/devices/:device/rooms/:id'), {id: '@_id'}, {
    'query': {
      isArray: true,
    }
  });

  //angular.merge(model.prototype, rooms.methods);

  return model;

}]);

devices.factory('Devices', ['$resource', '$http', '$q', 'abode', 'devices', function($resource, $http, $q, abode, devices) {

  var Devices = $resource(abode.url('/api/devices/:id'),{
    'id': '@_id'
  },{
    'update': {'method': 'PUT'},
  });

  angular.merge(Devices.prototype, devices.methods);

  return Devices;

}]);

devices.service('devices', function ($q, $http, $uibModal, $rootScope, $timeout, $resource, abode, DeviceRooms) {
  var model = $resource(abode.url('/api/devices/:id/:action'), {id: '@_id'}, {
    'update': { method: 'PUT' },
    'on': { method: 'POST', params: {'action': 'on'}},
    'off': { method: 'POST', params: {'action': 'off'}}
  });
  var devices = {};


  var methods = {};

  methods.$rooms = function () {
    return DeviceRooms.query({'device': this.name});

  };

  methods.$refresh = function (force) {
    var req,
      self = this,
      defer = $q.defer(),
      url = abode.url('/api/devices/' + this._id).value();


    if (force && self.active) {
      req = $http.post(abode.url('/api/devices/' + this._id + '/status').value());
    } else {
      req = $http.get(abode.url('/api/devices/' + this._id ).value());
    }

    req.then(function (response) {
      var results = response.data.response || response.data;

      for (var key in results) {
        if (results.hasOwnProperty(key)) {
          self[key] = results[key];
        }
      }
      defer.resolve(self);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  methods.$lock = function () {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/devices/' + this._id + '/lock').value();

    $http.post(url).then(function (response) {
      self._on = true;
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  methods.$unlock = function () {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/devices/' + this._id + '/unlock').value();

    $http.post(url).then(function (response) {
      self._on = false;
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  methods.$on = function () {
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

  methods.$off = function () {
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

  methods.$toggle = function () {
    var action,
      self = this,
      defer = $q.defer(),
      url = abode.url('/api/devices/' + this.name).value();

    if (self.active) {
      action = (self._on) ? self.$off : self.$on;
      action.apply(self).then(function (response) {
        defer.resolve(response);
      }, function (err) {
        defer.reject(err);
      });
    } else {
      $http.put(url, {'_on': !self._on}).then(function (response) {
        self._on = !self._on;
        defer.resolve(response.data);
      }, function (err) {
        defer.reject(err.data);
      });
    }

    return defer.promise;
  };

  methods.$open = function () {
    var self = this;

    return openDevice(self);
  };

  methods.$camera = function () {
    var self = this;

    openCamera(self);
  };

  methods.$set_mode = function (mode) {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/devices/' + this._id + '/set_mode').value();

    $http.post(url, [mode]).then(function (response) {
      self._mode = mode;
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  methods.$set_temp = function (temp) {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/devices/' + this._id + '/set_point').value();

    $http.post(url, [temp]).then(function (response) {
      self._set_point = temp;
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  methods.$set_level = function (level) {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/devices/' + this._id + '/set_level').value();

    $http.post(url, [level]).then(function (response) {
      self._level = level;
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;

  };

  methods.$image_url = function () {
    var random = new Date();
    return (this.config.image_url) ? abode.url('/api/devices/' + this._id + '/image?' + random.getTime()).value() : undefined;

  };

  methods.$video_url = function () {
    var random = new Date();
    return (this.config.video_url) ? abode.url('/api/devices/' + this._id + '/video?live=true').value() : undefined;

  };

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
          $uibModalInstance.close($scope.device);
        };

        if (device.config.video_url) {
          $scope.camera_url = abode.url(source_uri + '/devices/' + device._id + '/video').value();
        } else {
          $scope.camera_url = abode.url(source_uri + '/devices/' + device._id + '/image').value();
        }
      }
    });
  };

  var openDevice =function (device, source) {

    return $uibModal.open({
      animation: false,
      templateUrl: 'views/devices/devices.view.html',
      size: 'sm',
      controller: function ($scope, $uibModalInstance, $interval, $timeout, $state, device, source) {
        var intervals = [];
        var temp_wait, level_wait;
        var source_uri = (source === undefined) ? '/api' : '/api/sources/' + source;

        $scope.device = device;
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
          $state.go('main.devices.edit', {'name': device.name});
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

        $scope.reload = function (force) {

          if ($scope.processing || temp_wait || level_wait) {
            return;
          }

          $scope.processing = true;
          $scope.errors = false;

          $scope.device.$refresh(force).then(function (result) {
            $scope.processing = false;
            $scope.errors = false;
          }, function () {
            $scope.processing = false;
            $scope.errors = true;
          });

        };

        $scope.ok = function () {
          $uibModalInstance.close();
        };

        $scope.unlock = function () {

          $scope.processing = true;
          $scope.errors = false;

          $scope.device.$unlock().then(function () {
            $scope.processing = false;
            $scope.errors = false;
          }, function (err) {
            console.log(err);
            $scope.processing = false;
            $scope.errors = true;
          });
        };

        $scope.lock = function () {

          $scope.processing = true;
          $scope.errors = false;

          $scope.device.$lock().then(function () {
            $scope.processing = false;
            $scope.errors = false;
          }, function (err) {
            console.log(err);
            $scope.processing = false;
            $scope.errors = true;
          });
        };

        $scope.toggle_onoff = function () {

          $scope.processing = true;
          $scope.errors = false;

          $scope.device.$toggle().then(function () {
            $scope.processing = false;
            $scope.errors = false;
          }, function (err) {
            console.log(err);
            $scope.processing = false;
            $scope.errors = true;
          });
          /*
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
          */
        };

        $scope.set_mode = function (mode) {

          $scope.processing = true;
          $scope.errors = false;

          $scope.device.$set_mode(mode).then(function () {
            $scope.processing = false;
            $scope.errors = false;
          }, function (err) {
            console.log(err);
            $scope.processing = false;
            $scope.errors = true;
          });
        };


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

          $scope.device.$set_temp($scope.device._set_point).then(function () {
          //$http.post(source_uri + '/devices/' + $scope.device.name + '/set_point', [$scope.device._set_point]).then(function (response) {
            temp_wait = undefined;
            $scope.processing = false;
            $scope.errors = false;
          }, function () {
            temp_wait = undefined;
            $scope.processing = false;
            $scope.errors = true;
          });
        };

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

          $scope.device.$set_level($scope.device._level).then(function () {
            level_wait = undefined;
            $scope.processing = false;
            $scope.errors = false;
          }, function () {
            level_wait = undefined;
            $scope.processing = false;
            $scope.errors = true;
          });
        };

        intervals.push($interval($scope.reload, 10000));

        $scope.$on('$destroy', function () {
          intervals.forEach($interval.cancel);
        });
      },
      resolve: {
        device: function (Devices) {
          if (typeof device === 'object') {
            return Devices.get({'id': device._id}).$promise;
          } else {
            return Devices.get({'id': device}).$promise;
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
    'openCamera': openCamera,
    'methods': methods,
  };
});

devices.controller('devicesList', function ($scope, $state, Devices) {
  $scope.devices = [];
  $scope.loading = true;

  $scope.view = function (device) {
    device.$open();
  };

  $scope.edit = function (device) {
    $state.go('main.devices.edit', {'name': device.name});
  };

  $scope.load = function () {
    Devices.query().$promise.then(function (results) {
      $scope.devices = results;
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

devices.controller('devicesEdit', function ($scope, $state, $uibModal, abode, devices, device, confirm, providers, capabilities) {
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
    $scope.device.$rooms().$promise.then(function(rooms) {
      $scope.rooms = rooms;
      $scope.loading = false;
    }, function () {
      $scope.loading = false;
    });
  };

  getRooms();

  $scope.back = function () {
    $state.go('main.devices.list');
  };

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

  $scope.save = function () {
    $scope.device.$update().then(function () {
      abode.message({'type': 'success', 'message': 'Device Saved'});
    }, function (err) {
        abode.message({'type': 'failed', 'message': 'Failed to save Device', 'details': err});
      $scope.errors = err;
    });
  };

  $scope.remove = function () {
    confirm('Are you sure you want to remove this Device?').then(function () {
      $scope.device.$remove().then(function () {
        abode.message({'type': 'success', 'message': 'Device Removed'});
        $state.go('main.devices');
      }, function (err) {
        abode.message({'type': 'failed', 'message': 'Failed to remove Device', 'details': err});
        $scope.errors = err;
      });
    });
  };

  $scope.removeRoom = function (id) {

    confirm('Are you sure?').then(function () {
      devices.removeRoom(device.name, id).then(function () {
        getRooms();
        abode.message({'type': 'success', 'message': 'Room removed from Device'});
      }, function () {
        abode.message({'type': 'failed', 'message': 'Failed to remove Room from Device', 'details': err});
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
      controller: function ($scope, $uibModalInstance, Rooms, assigned) {
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
          Rooms.query().$promise.then(function (rooms) {
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
        abode.message({'type': 'success', 'message': 'Room added to Device'});
      }, function () {
        abode.message({'type': 'failed', 'message': 'Failed to add Room to Device', 'details': err});
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

devices.controller('devicesAdd', function ($scope, $state, abode, Devices, providers, capabilities) {
  $scope.device = new Devices({'capabilities': []});
  $scope.alerts = [];
  $scope.providers = providers;
  $scope.capabilities = capabilities;
  $scope.section = 'provider';
  $scope.provider_templates = {};

  $scope.providers.forEach(function (p) {
    $scope.provider_templates[p] = '/views/providers/' + p + '/add.html';
  });

  $scope.back = function () {
    $state.go('main.devices');
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
    $scope.device.$save().then(function () {
      abode.message({'type': 'success', 'message': 'Device Added'});
      $scope.device = new Devices({'capabilities': []});
      $scope.section = 'provider';
    }, function (err) {
        abode.message({'type': 'failed', 'message': 'Failed to add Device', 'details': err});
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
