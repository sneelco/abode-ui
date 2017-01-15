var rooms = angular.module('abode.rooms', ['ui.router','ngResource']);

rooms.config(function($stateProvider, $urlRouterProvider) {

  $urlRouterProvider.when('/rooms', '/rooms/list');

  $stateProvider
  .state('main.rooms', {
    url: '/rooms',
    templateUrl: '/views/rooms/rooms.html',
  })
  .state('main.rooms.list', {
    url: '/list',
    templateUrl: '/views/rooms/rooms.list.html',
    controller: 'roomsList'
  })
  .state('main.rooms.add', {
    url: '/add',
    templateUrl: '/views/rooms/rooms.add.html',
    controller: 'roomsAdd'
  })
  .state('main.rooms.edit', {
    url: '/:name',
    templateUrl: '/views/rooms/rooms.edit.html',
    controller: 'roomsEdit',
    resolve: {
      'room': function ($stateParams, $state, Rooms) {

        return Rooms.get({'id': $stateParams.name}).$promise;

      }
    }
  });
});

rooms.factory('Rooms', ['$resource', '$q', '$http', 'abode', 'rooms', 'RoomDevices', 'RoomScenes', function ($resource, $q, $http, abode, rooms, RoomDevices, RoomScenes) {

  var Rooms = $resource(abode.url('/api/rooms/:id/:action'), {id: '@_id'}, {
    'update': { method: 'PUT' },
  });


  Rooms.prototype.$open = function (controls) {
    var self = this;

    return rooms.view(self, undefined, undefined, controls);
  };

  Rooms.prototype.$refresh = function () {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/rooms/' + this._id + '/status').value();

    $http.get(url).then(function (response) {
      for (var key in response.data.room) {
        if (response.data.room.hasOwnProperty(key)) {
          self[key] = response.data.room[key];
        }
      }
      defer.resolve(self);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  Rooms.prototype.$devices = function () {
    return RoomDevices.query({'room': this.name});
  };

  Rooms.prototype.$scenes = function () {
    return RoomScenes.query({'room': this.name});
  };

  Rooms.prototype.$on = function () {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/rooms/' + this._id + '/on').value();

    $http.post(url).then(function (response) {
      self._lights_on = true;
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  Rooms.prototype.$off = function () {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/rooms/' + this._id + '/off').value();

    $http.post(url).then(function (response) {
      self._lights_on = false;
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  Rooms.prototype.$addDevice = function (device) {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/rooms/' + this._id + '/devices').value();

    $http.post(url, {'_id': device._id || device}).then(function (results) {
      defer.resolve();
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  Rooms.prototype.$removeDevice = function (device) {
    var self = this,
      defer = $q.defer(),
      device_id = device._id || device;
      url = abode.url('/api/rooms/' + this._id + '/devices/' + device_id).value();

    $http.delete(url).then(function (results) {
      defer.resolve();
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  Rooms.prototype.$addScene = function (scene) {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/rooms/' + this._id + '/scenes').value();

    $http.post(url, {'_id': scene._id || scene}).then(function (results) {
      defer.resolve();
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  Rooms.prototype.$removeScene = function (scene) {
    var self = this,
      defer = $q.defer(),
      scene_id = scene._id || scene;
      url = abode.url('/api/rooms/' + this._id + '/scenes/' + scene_id).value();

    $http.delete(url).then(function (results) {
      defer.resolve();
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  return Rooms;
}]);

rooms.service('rooms', function ($http, $q, $uibModal, $resource, $rootScope, $timeout, abode, RoomScenes, RoomDevices, devices) {
  var rooms = {};

  $rootScope.$on('ROOM_CHANGE', function (event, args) {

    args.source = args.source || 'local';
    rooms[args.source] = rooms[args.source] || {};
    rooms[args.source][args.object._id] = args.object;
    rooms[args.source][args.object._id].$updated = new Date();
    //console.log('Room event from %s: %s', args.source, args);

  });

  var loadRooms = function (source) {
    var defer = $q.defer();
    var req_timeout;

    Rooms.query({'source': source}).$promise.then(function (results) {
      $timeout.cancel(req_timeout);
      defer.resolve(results);
    }, function (err) {
      $timeout.cancel(req_timeout);
      defer.reject(err);
    });

    req_timeout = $timeout(function () {
      defer.reject('Request timed out');
    }, 10000);

    return defer.promise;
  };

  var addRoom = function (config) {
    var defer = $q.defer();
    var room = new Rooms(config);

    room.$save().then(function (response) {
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var get_by_name = function (name, source) {
    var found;

    source = source || 'local';

    if (!rooms[source]) {
      return;
    }

    if (rooms[source][name]) {
      return rooms[source][name];
    }

    Object.keys(rooms[source]).forEach(function (id) {
      if (rooms[source][id].name === name) {
        found = rooms[source][id];
      }
    });

    return found;
  };

  var getRoom = function (room, source) {
    var defer = $q.defer();
    var req_timeout;

    source = source || 'local';

    var lookup = get_by_name(room, source);
    var now = new Date();

    if (lookup) {

      if ( ((now - lookup.$updated) < 1000 * 60) ) {
        defer.resolve(lookup);
        return defer.promise;
      }
    }

    Room.get({'id': room}).$promise.then(function (response) {
      $timeout.cancel(req_timeout);
      rooms[source] = rooms[source] || {};
      rooms[source][response.data._id] = response.data;
      rooms[source][response.data._id].$updated = new Date();

      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    req_timeout = $timeout(function () {
      defer.reject('Request timed out');
    }, 25000);

    return defer.promise;
  };

  var getRoomScenes = function (room, source) {
    var defer = $q.defer();

    RoomScenes.query({'room': room, 'source': source}).$promise.then(function (results) {

      results.forEach(function (scene) {
        if (scene._on === true) {
          scene.age = new Date() - new Date(scene.last_on);
        } else {
          scene.age = new Date() - new Date(scene.last_off);
        }

        if (!isNaN(scene.age)) {
          scene.age = scene.age / 1000;
        } else {
          scene.age = 0;
        }
      });

      defer.resolve(results);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var getRoomDevices = function (room, source) {
    var defer = $q.defer();

    RoomDevices.query({'room': room, 'source': source}).$promise.then(function (results) {
      var devs = [];

      results.forEach(function (device) {

        devs.push(devices.set(device));

      });

      defer.resolve(results);

    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var viewRoom = function (room, devices, scenes, controls) {

    return $uibModal.open({
      animation: false,
      templateUrl: 'views/rooms/rooms.view.html',
      size: 'lg',
      controller: function ($scope, $uibModalInstance, $interval, $timeout, $state, rooms, room, devices, scenes) {
        var intervals = [];
        var reload_timer;

        $scope.name = room.name;
        $scope.room = room;
        $scope.devices = devices;
        $scope.scenes = scenes;
        $scope.cameras = [];
        $scope.open = devices.openDevice;
        $scope.filter_counts = {};
        $scope.on_counts = {};
        $scope.room_temperature = '?';
        $scope.destroyed = false;
        $scope.controls = controls || false;

        var filters = {
          'light': ['light'],
          'motion_sensor': ['motion_sensor'],
          'window': ['window'],
          'door': ['door'],
          'temperature_sensor': ['conditioner', 'temperature_sensor', 'fan', 'humidity_sensor'],
        };

        $scope.set_device_level = function (device) {
          return function (id, level) {
            device.$set_level(level);
          };
        };

        $scope.toggleControls = function () {
          $scope.controls = (!$scope.controls);

          if ($scope.controls) {
            $timeout(function () {
                $scope.$broadcast('rzSliderForceRender');
            }, 100);
          }
        };

        $scope.filter = function (filter) {
          $scope.filter_condition = (filter !== $scope.filter_condition) ? filter : '';
        };

        $scope.check_filter = function (device) {

          if ($scope.filter_condition === '' || $scope.filter_condition === undefined) {
            return true;
          }

          return $scope.has_capability(device, filters[$scope.filter_condition]);
        };

        $scope.devices_on = function (c) {
          var devs = $scope.devices.filter(function (d) {
            return (d._on === true && d.capabilities.indexOf(c) !== 0);
          });

          return (devs.length > 0);
        };

        $scope.openScene = function (scene) {
          var modal = scene.$view();
          modal.result.then(function(config) {
            if (config && config.recurse) {
              $uibModalInstance.close(config);
            }
          });
        };

        $scope.open = function (device) {
          var modal = device.$open();
          modal.result.then(function(config) {
            if (config && config.recurse) {
              $uibModalInstance.close(config);
            }
          });
        };

        $scope.ok = function () {
          $uibModalInstance.close();
        };

        $scope.edit = function () {
          $uibModalInstance.close({'recurse': true});
          $state.go('main.rooms.edit', {'name': room.name});
        };


        $scope.default_filter = function () {

          var temp = 0;
          var temp_count = 0;

          var temps = $scope.devices.filter(function (d) {
            if (d.capabilities.indexOf('temperature_sensor') !== -1) {
              if (d._temperature > 0) {
                temp += d._temperature ;
                temp_count += 1;
              }
              return true;
            }
            return false;
          });

          $scope.cameras = $scope.devices.filter( function (d) { return d.capabilities.indexOf('camera') !== -1; } );

          $scope.room_temperature = parseInt(temp / temp_count, 10) || ' ';

          Object.keys(filters).forEach(function (f) {


            var match = $scope.devices.filter(function (d) {
              return $scope.has_capability(d, filters[f]);
            });

            $scope.filter_counts[f] = match.length;
            $scope.on_counts[f] = match.filter( function (d) {return d._on; }).length;

            if ($scope.filter_condition !== undefined) return;

            if (match.length > 0) {
              $scope.filter_condition = f;
            }
          });

          if ($scope.filter_condition !== undefined) return;
          if ($scope.scenes.length > 0) {
            $scope.filter_condition = 'scenes';
          }
        };

        $scope.reload = function () {

          var errors = false;
          if ($scope.controls) {
            return;
          }

          $scope.processing = true;
          $scope.errors = false;

          $timeout.cancel(reload_timer);

          var done = function () {
            $scope.errors = errors;
            $scope.processing = false;

            if ($scope.destroyed) {
              return;
            }
            reload_timer = $timeout($scope.reload, 5000);
          };

          var room_scenes = function () {
            $scope.room.$scenes().$promise.then(function (scenes) {
              $scope.scenes = scenes;
              $scope.filter_counts.scenes = $scope.scenes.length;
              $scope.on_counts.scenes = $scope.scenes.filter(function (d) { return d._on; });

              done();
            }, function () {
              errors = true;
              done();
            });
          };

          var room_devices = function () {

            $scope.room.$devices().$promise.then(function (devices) {
              $scope.devices = devices;
              $scope.default_filter();

              room_scenes();

            }, function () {
              errors = true;
              room_scenes();
            });

          };

          $scope.room.$refresh().then(function (room) {

            room_devices();
          }, function () {
            errors = true;
            done();
          });


        };

        $scope.has_capability = function (device, cap) {
          var has = false;
          if (!(cap instanceof Array)) {
            cap = [cap];
          }

          cap.forEach(function (c) {
            has = (device.capabilities.indexOf(c) !== -1) ? true : has;
          });

          return has;
        };

        $scope.device_state = function (device, key, match, cap) {
          if (cap) {
            return (device[key] === match && $scope.has_capability(device, cap));
          } else {
            return (device[key] === match);
          }
        };

        $scope.default_filter();
        $scope.reload();

        $scope.$on('$destroy', function () {
          $scope.destroyed = true;
          $timeout.cancel(reload_timer);
          intervals.forEach($interval.cancel);
        });
      },
      resolve: {
        room: function (Rooms) {
          if (typeof room === 'object') {
            return room;
          } else {
            return Rooms.get({'id': room});
          }
        },
        devices: function () {
          return devices || room.$devices().$promise;
        },
        scenes: function () {
          return scenes || room.$scenes().$promise;
        }
      },
    });

  };

  var addRoomDevice = function (room, device) {
    var defer = $q.defer();

    roomdevice = new RoomDevices({'id': room, 'source': source, 'name': device}).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var removeRoomDevice = function (room, device) {
    var defer = $q.defer();

    $http.delete('/api/rooms/' + room + '/devices/' + device).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var saveRoom = function (room) {
    var defer = $q.defer();

    $http.put('/api/rooms/' + room._id, room).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var removeRoom = function (room) {
    var defer = $q.defer();

    $http.delete('/api/rooms/' + room).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  return {
    'load': loadRooms,
    'add': addRoom,
    'view': viewRoom,
    'get': getRoom,
    'save': saveRoom,
    'remove': removeRoom,
    'getDevices': getRoomDevices,
    'addDevice': addRoomDevice,
    'removeDevice': removeRoomDevice,
  };
});

rooms.controller('roomsList', function ($scope, $state, Rooms) {
  $scope.rooms = [];
  $scope.loading = true;

  $scope.view = function (room) {
    room.$open();
  };

  $scope.edit = function (room) {
    $state.go('main.rooms.edit', {'name': room.name});
  };

  $scope.load = function () {
    Rooms.query().$promise.then(function (results) {
      $scope.rooms = results;
      $scope.loading = false;
      $scope.error = false;
    }, function () {
      $scope.loading = false;
      $scope.error = true;
    });
  };



  $scope.load();
});

rooms.controller('roomsAdd', function ($scope, $state, abode, Rooms) {
  $scope.room = new Rooms();
  $scope.alerts = [];

  $scope.back = function () {
    $state.go('main.rooms');
  };

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

  $scope.add = function () {
    $scope.room.$save().then(function () {
      abode.message({'type': 'success', 'message': 'Room Added'});
      $scope.room = new Rooms();
    }, function (err) {
      abode.message({'type': 'failed', 'message': 'Failed to add Room', 'details': err});
      $scope.errors = err;
    });
  };
});

rooms.controller('roomsEdit', function ($scope, $state, $uibModal, abode, rooms, room, RoomDevices, confirm) {
  $scope.room = room;
  $scope.alerts = [];
  $scope.devices = [];
  $scope.scenes = [];
  $scope.loading = false;
  $scope.section = 'general';

  if (!room) {
    $state.go('main.rooms.list');
  }

  var getDevices = function () {
    $scope.loading = true;
    room.$devices().$promise.then(function (devices) {
      $scope.devices = devices;
      $scope.loading = false;
    }, function (error) {
      $scope.loading = false;
    });
  };

  var getScenes = function () {
    $scope.loading = true;
    room.$scenes().$promise.then(function (scenes) {
      $scope.scenes = scenes;
      $scope.loading = false;
    }, function (error) {
      $scope.loading = false;
    });
  };

  getDevices();

  $scope.back = function () {
    $state.go('main.rooms');
  };

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

  $scope.save = function () {
    $scope.room.$update().then(function () {
      abode.message({'type': 'success', 'message': 'Room Saved'});
    }, function (err) {
      abode.message({'type': 'failed', 'message': 'Failed to save Room', 'details': err});
      $scope.errors = err;
    });
  };

  $scope.remove = function () {
    confirm('Are you sure you want to remove this Room?').then(function () {
      $scope.room.$remove().then(function () {
        abode.message({'type': 'success', 'message': 'Room Removed'});
        $state.go('main.rooms');
      }, function (err) {
        abode.message({'type': 'failed', 'message': 'Failed to remove Room', 'details': err});
        $scope.errors = err;
      });
    });
  };

  $scope.removeDevice = function (id) {

    confirm('Are you sure?').then(function () {
      $scope.room.$removeDevice(id).then(function () {
        getDevices();
        abode.message({'type': 'success', 'message': 'Device removed from Room'});
      }, function (err) {
        abode.message({'type': 'failed', 'message': 'Failed to remove Device from Room', 'details': err});
      });
    });

  };

  $scope.addDevice = function () {
    var assign = $uibModal.open({
      animation: true,
      templateUrl: 'views/rooms/assign.html',
      size: 'sm',
      resolve: {
        assigned: function () {
          return $scope.devices.map(function (obj) {return obj.name; });
        }
      },
      controller: function ($scope, $uibModalInstance, devices, assigned) {
        $scope.loading = true;
        $scope.devices = [];
        $scope.assigned = assigned;

        $scope.cancel = function () {
          $uibModalInstance.dismiss();
        };

        $scope.select = function (device) {
          $uibModalInstance.close(device);
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

        $scope.load();

      }
    });

    assign.result.then(function (device) {

      $scope.room.$addDevice(device).then(function () {
        getDevices();
        abode.message({'type': 'success', 'message': 'Device added to Room'});
      }, function (err) {
        abode.message({'type': 'failed', 'message': 'Failed to add Device to Room', 'details': err});
      });

    });
  };

  $scope.removeScene = function (id) {

    confirm('Are you sure?').then(function () {
      $scope.room.$removeScene(id).then(function () {
        getScenes();
        abode.message({'type': 'success', 'message': 'Scene removed from Room'});
      }, function (err) {
        abode.message({'type': 'failed', 'message': 'Failed to remove Scene from Room', 'details': err});
      });
    });

  };

  $scope.addScene = function () {
    var assign = $uibModal.open({
      animation: true,
      templateUrl: 'views/rooms/assign.scene.html',
      size: 'sm',
      resolve: {
        assigned: function () {
          return $scope.scenes.map(function (obj) {return obj.name; });
        }
      },
      controller: function ($scope, $uibModalInstance, Scenes, assigned) {
        $scope.loading = true;
        $scope.scenes = [];
        $scope.assigned = assigned;

        $scope.cancel = function () {
          $uibModalInstance.dismiss();
        };

        $scope.select = function (device) {
          $uibModalInstance.close(device);
        };

        $scope.load = function () {
          Scenes.query().$promise.then(function (scenes) {
            $scope.scenes = scenes;
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

    assign.result.then(function (scene) {

      $scope.room.$addScene(scene).then(function () {
        getScenes();
        abode.message({'type': 'success', 'message': 'Scene added to Room'});
      }, function (err) {
        abode.message({'type': 'failed', 'message': 'Failed to add Scene to Room', 'details': err});
      });

    });
  };

});

rooms.controller('room', function () {

});

rooms.directive('roomCameras', function () {

  return {
    restrict: 'E',
    transclude: true,
    replace: true,
    scope: {
      'devices': '=',
      'source': '=',
    },
    templateUrl: 'views/rooms/rooms.cameras.html',
    controller: function ($scope, abode, devices) {
      var source_uri = ($scope.source === undefined) ? '/api' : '/api/sources/' + $scope.source;
      var random = new Date();

      $scope.devices = $scope.devices || [];
      $scope.cameras = [];
      $scope.index = 0;


      var parseDevices = function () {
        var cameras = [];
        $scope.devices.forEach(function (device) {
          if (device.config.image_url) {
            var camera = {
              '_id': device._id,
              'name': device.name,
              'image': device.$image_url(),
            };

            if (device.config.video_url) {
              camera.video = device.$video_url();
            }

            cameras.push(camera);
          }
        });

        $scope.cameras = cameras;
      };

      $scope.next = function () {
        if ($scope.index >= $scope.cameras.length - 1) {
          $scope.index = 0;
        } else {
          $scope.index += 1;
        }
      };

      $scope.previous = function () {
        if ($scope.index === 0) {
          $scope.index = $scope.cameras.length - 1;
        } else {
          $scope.index -= 1;
        }
      };

      $scope.reload = function (index) {
        random = new Date();
        var device = $scope.devices.filter(function (d) { return d._id === $scope.cameras[$scope.index]._id; });

        if (device[0]) {
          $scope.cameras[$scope.index].image = device[0].$image_url();
        }
      };


      $scope.play = function () {
        var camera = $scope.cameras[$scope.index];
        var device = $scope.devices.filter(function (dev) { return dev._id === camera._id; });

        devices.openCamera(device[0], $scope.source);
      };

      $scope.$watch('devices', function () {
        if ($scope.cameras.length !== 0 ) { return; }
        parseDevices();
      });

    }
  };
});

rooms.directive('roomIcon', function () {

  return {
    restrict: 'E',
    transclude: true,
    scope: {
      'left': '@',
      'right': '@',
      'top': '@',
      'bottom': '@',
      'width': '@',
      'height': '@',
      'align': '@',
      'size': '@',
      'room': '=?',
      'name': '@',
      'id': '@',
      'icon': '@',
      'tempType': '@',
      'interval': '@',
      'source': '@',
    },
    templateUrl: 'views/rooms/room.icon.html',
    controller: function ($scope, $interval, $timeout, $rootScope, abode, rooms, Rooms) {

      $scope.loading = false;
      $scope.error = false;
      $scope.styles =  {};

      var success_splay = 1000 * 60 * Math.floor((Math.random() * 5) + 5);
      var error_splay = 1000 * Math.floor((Math.random() * 5) + 1);

      //If we get an EVENTS_RESET event, schedule a refresh
      var feed_detector = abode.scope.$on('EVENTS_RESET', function (event, msg) {
        if ($scope.loader) {
          $timeout.cancel($scope.loader);
        }

        $scope.loader = $timeout($scope.refresh, error_splay);
      });

      //If we get an EVENTS_RESET event, schedule a refresh
      var room_events = abode.scope.$on('UPDATED', function (event, msg) {
        if (msg.type === 'room' && $scope.room && msg.object._id === $scope.room._id) {
          if ($scope.loader) {
            $timeout.cancel($scope.loader);
          }

          if (!$scope.icon && msg.object.icon) {
            $scope.icon = msg.object.icon;
            $scope.show_icon = true;
          }

          angular.merge($scope.room, msg.object);
          $scope.loader = $timeout($scope.refresh, success_splay);
        }
      });

      //Build our styles
      if ($scope.left !== undefined || $scope.right !== undefined || $scope.top !== undefined || $scope.bottom !== undefined) {
        $scope.styles.position = 'absolute';
      }
      if ($scope.left) { $scope.styles.left = $scope.left + 'em'; }
      if ($scope.right) { $scope.styles.right = $scope.right + 'em'; }
      if ($scope.top) { $scope.styles.top = $scope.top + 'em'; }
      if ($scope.bottom) { $scope.styles.bottom = $scope.bottom + 'em'; }

      if ($scope.width) { $scope.styles.width = $scope.width + 'em'; }
      if ($scope.height) { $scope.styles.height = $scope.height + 'em'; }
      if ($scope.align) { $scope.styles['text-align'] = $scope.align; }
      if ($scope.size) { $scope.styles['font-size'] = $scope.size + 'em'; }

      if ($scope.icon) { $scope.show_icon = true; }

      //Room view function
      $scope.view = function () {
        rooms.view($scope.room, $scope.devices);
      };

      //Loader function
      $scope.load = function () {
        if ($scope.loading) {
          return;
        }

        $scope.loading = true;
        $scope.error = false;

        Rooms.get({'id': $scope.id || $scope.name || $scope.room._id || $scope.room}).$promise.then(function (obj) {
          $scope.loading = false;
          $scope.error = false;
          $scope.room = obj;

          if (!$scope.icon && obj.icon) {
            $scope.icon = obj.icon;
            $scope.show_icon = true;
          }

          $scope.loader = $timeout($scope.refresh, success_splay);
        }, function (err) {
          $scope.loading = false;
          $scope.error = true;
        });
      };

      //Loader function
      $scope.refresh = function () {
        if ($scope.loading) {
          return;
        }

        $scope.loading = true;
        $scope.error = false;

        $scope.room.$refresh().then(function () {
          $scope.loading = false;
          $scope.error = false;

          $scope.loader = $timeout($scope.refresh, success_splay);
        }, function () {
          $scope.loading = false;
          $scope.error = true;

          $scope.loader = $timeout($scope.refresh, error_splay);
        });
      };

      $scope.loader = $timeout($scope.load, 100);

      $scope.$on('$destroy', function () {
        //Kill our even listeners
        room_events();
        feed_detector();

        // Kill our loader timeout if active
        if ($scope.loader) {
          $timeout.cancel($scope.loader);
        }
      });

    },
    replace: true,
  };

});
