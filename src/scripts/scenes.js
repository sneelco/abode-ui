var scenes = angular.module('abode.scenes', ['ui.router','ngResource']);

scenes.config(function($stateProvider, $urlRouterProvider) {

  $urlRouterProvider.when('/scenes', '/scenes/list');

  $stateProvider
  .state('main.scenes', {
    url: '/scenes',
    templateUrl: '/views/scenes/scenes.html',
  })
  .state('main.scenes.list', {
    url: '/list',
    templateUrl: '/views/scenes/scenes.list.html',
    controller: 'scenesList'
  })
  .state('main.scenes.add', {
    url: '/add',
    templateUrl: '/views/scenes/scenes.add.html',
    controller: 'scenesAdd'
  })
  .state('main.scenes.edit', {
    url: '/:name',
    templateUrl: '/views/scenes/scenes.edit.html',
    controller: 'scenesEdit',
    resolve: {
      'scene': function ($stateParams, $state, $q, Scenes) {

        return Scenes.get({'id': $stateParams.name}).$promise;

      }
    }
  });
});

scenes.factory('Scenes', ['$resource', '$http', '$q', 'abode', 'scenes', function($resource, $http, $q, abode, scenes) {

  var model = $resource(abode.url('/api/scenes/:id'),{
    'id': '@_id'
  },{
    'update': {'method': 'PUT'},
  });

  angular.merge(model.prototype, scenes.methods);

  return model;

}]);

scenes.factory('SceneRooms', ['$resource', 'abode', function ($resource, abode) {

  var model = $resource(abode.url('/api/scenes/:scene/rooms/:id'), {id: '@_id'}, {
    'query': {
      isArray: true,
    }
  });

  angular.merge(model.prototype, scenes.methods);

  return model;

}]);

scenes.factory('RoomScenes', ['$resource', 'abode', 'scenes', function ($resource, abode, scenes) {

  var model = $resource(abode.url('/api/rooms/:room/scenes/:id'), {id: '@_id'}, {
    'query': {
      isArray: true,
      transformResponse: [
        function (data, headers, status) {
          if (status !== 200) {
            return data;
          }
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

  angular.merge(model.prototype, scenes.methods);

  return model;

}]);

scenes.service('scenes', function ($http, $q, $uibModal, $resource, abode, SceneRooms) {
  var model = $resource(abode.url('/api/scenes/:id/:action'), {id: '@_id'}, {
    'update': { method: 'PUT' },
    'on': { method: 'POST', params: {'action': 'on'}},
    'off': { method: 'POST', params: {'action': 'off'}}
  });

  var methods = {};

  methods.$rooms = function () {
    var self = this;
    return SceneRooms.query({'scene': self.name}).$promise;

  };

  methods.$refresh = function () {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/scenes/' + this._id).value();

    $http.get(url).then(function (response) {
      for (var key in response.data) {
        if (response.data.hasOwnProperty(key)) {
          self[key] = response.data[key];
        }
      }
      defer.resolve(self);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  methods.$toggle = function () {
    var self = this,
      action = 'off';

    if (self._state === 'stopped') {
      return self.$on();
    } else {
      return self.$off();
    }

  };

  methods.$on = function () {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/scenes/' + this._id + '/on').value();

    $http.post(url).then(function (response) {
      self._on = true;
      self._state = 'pending';
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  methods.$off = function () {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/scenes/' + this._id + '/off').value();

    $http.post(url).then(function (response) {
      self._on = false;
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  methods.$open = function () {

  };

  methods.$addRoom = function (room) {
    var self = this,
      defer = $q.defer();

    $http.post(abode.url('/api/scenes/' + self.name + '/rooms').value(), {'name': room}).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  methods.$removeRoom = function (room) {
    var self = this,
      defer = $q.defer();

    $http.delete(abode.url('/api/scenes/' + self.name + '/rooms/' + room).value()).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  methods.$view = function () {
    return viewScene(this);
  };

  var loadScenes = function (source) {
    var defer = $q.defer();

    model.query({'source': source}).$promise.then(function (results) {
      defer.resolve(results);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var addScene = function (config) {
    var defer = $q.defer();

    $http.post('/api/scenes', config).then(function (response) {
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var getScene = function (scene, source) {
    var defer = $q.defer();
    var source_uri = (source === undefined) ? '/api' : '/api/sources/' + source;

    $http({ url: source_uri + '/scenes/' + scene }).then(function (response) {

      response.data.$on = function () {
        return $http.post(source_uri + '/scenes/' + scene + '/on');
      };
      response.data.$off = function () {
        return $http.post(source_uri + '/scenes/' + scene + '/off');
      };
      response.data.$open = function () {
        return viewScene(scene, source);
      };
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var getSceneRooms = function (scene) {
    var defer = $q.defer();

    $http({ url: '/api/scenes/' + scene + '/rooms'}).then(function (response) {

      defer.resolve(response.data);

    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var viewScene = function (scene, source) {

    return $uibModal.open({
      animation: true,
      templateUrl: 'views/scenes/scenes.view.html',
      size: 'sm',
      controller: function ($scope, $uibModalInstance, $interval, $timeout, $state, scene) {
        var intervals = [];
        var source_uri = (source === undefined) ? '/api' : '/api/sources/' + source;

        $scope.name = scene.name;
        $scope.scene = scene;
        $scope.processing = false;
        $scope.errors = false;

        $scope.ok = function () {
          $uibModalInstance.close();
        };

        $scope.edit = function () {
          $uibModalInstance.close({'recurse': true});
          $state.go('main.scenes.edit', {'name': scene.name});
        };

        $scope.toggle_onoff = function () {

          $scope.scene.$toggle().then(function() {
            $scope.processing = false;
            $scope.errors = false;
            $scope.scene._state = 'pending';

          }, function () {
            $scope.processing = false;
            $scope.errors = true;
          });

        };

        $scope.reload = function () {
          if ($scope.processing) {
            return;
          }

          $scope.processing = true;
          $scope.errors = false;

          $scope.scene.$refresh().then(function(response) {
            $scope.processing = false;
            $scope.errors = false;

          }, function () {
            $scope.processing = false;
            $scope.errors = true;
          });

        };

        $scope.reload();

        intervals.push($interval($scope.reload, 5000));

        $scope.$on('$destroy', function () {
          intervals.forEach($interval.cancel);
        });
      },
      resolve: {
        scene: function (Scenes) {
          if (typeof scene === 'object') {
            return Scenes.get({'id': scene._id}).$promise;
          } else {
            return Scenes.get({'id': scene}).$promise;
          }
        },
        source: function () {
          return source;
        },
      }
    });

  };

  var addSceneRoom = function (scene, room) {
    var defer = $q.defer();

    $http.post('/api/scenes/' + scene + '/rooms', {'name': room}).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var removeSceneRoom = function (scene, room) {
    var defer = $q.defer();

    $http.delete('/api/scenes/' + scene + '/rooms/' + room).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var saveScene = function (scene) {
    var defer = $q.defer();

    $http.put('/api/scenes/' + scene._id, scene).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var removeScene = function (scene) {
    var defer = $q.defer();

    $http.delete('/api/scenes/' + scene).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  return {
    'load': loadScenes,
    'add': addScene,
    'view': viewScene,
    'get': getScene,
    'save': saveScene,
    'remove': removeScene,
    'getRooms': getSceneRooms,
    'addRoom': addSceneRoom,
    'removeRoom': removeSceneRoom,
    'methods': methods
  };
});

scenes.controller('scenesList', function ($scope, $state, scenes) {
  $scope.scenes = [];
  $scope.loading = true;

  $scope.view = function (scene) {
    scenes.view(scene.name);
  };

  $scope.edit = function (scene) {
    $state.go('main.scenes.edit', {'name': scene.name});
  };

  $scope.load = function () {
    scenes.load().then(function (scenes) {
      $scope.scenes = scenes;
      $scope.loading = false;
      $scope.error = false;
    }, function () {
      $scope.loading = false;
      $scope.error = true;
    });
  };



  $scope.load();
});

scenes.controller('scenesAdd', function ($scope, $state, abode, Scenes) {
  $scope.scene = new Scenes();
  $scope.alerts = [];

  $scope.back = function () {
    $state.go('index.scenes');
  };

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

  $scope.add = function () {
    $scope.scene.$save().then(function () {
      abode.message({'type': 'success', 'message': 'Scene Added'});
      $state.go('^.list');
    }, function (err) {
      abode.message({'type': 'failed', 'message': 'Failed to add Scene', 'details': err});
      $scope.errors = err;
    });
  };
});

scenes.controller('scenesEdit', function ($scope, $state, $uibModal, scene, devices, abode, scenes, rooms, confirm) {
  $scope.scene = scene;
  $scope.alerts = [];
  $scope.rooms = [];
  $scope.loading = false;
  $scope.section = 'general';

  if (!scene) {
    $state.go('main.scenes.list');
  }

  var getRooms = function () {
    $scope.loading = true;
    $scope.scene.$rooms().then(function(rooms) {
      $scope.rooms = rooms;
      $scope.loading = false;
    }, function () {
      $scope.loading = false;
    });
  };

  getRooms();

  $scope.back = function () {
    $state.go('index.scenes');
  };

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

  $scope.addStep = function () {
    $scope.scene._steps.push({
      'actions': [],
      'delay': 0,
      'wait': false,
    });
  };

  $scope.removeDevice = function(step, index) {
    step.actions.splice(index, 1);
  };

  $scope.sceneBuilder = function (actions) {
    var builder = $uibModal.open({
      animation: true,
      templateUrl: 'views/scenes/scene.builder.html',
      resolve: {
      },
      controller: function ($scope, $uibModalInstance, $q, $timeout, Devices) {
        $scope.loading = true;
        $scope.devices = [];
        var device_defers = [];


        $scope.addDevice = function () {

          var deviceModal = $uibModal.open({
            animation: false,
            templateUrl: 'views/scenes/scene.builder.devices.html',
            size: 'sm',
            controller: function ($scope, $uibModalInstance, Devices) {
              $scope.loading = true;
              $scope.closing = false;
              $scope.devices = [];

              Devices.query().$promise.then(function (results) {
                $scope.devices = results;
                $scope.loading = false;
              }, function () {
                $scope.loading = false;
              });

              $scope.select = function (device) {
                $scope.closing = true;
                Devices.get({'id': device._id}).$promise.then(function (record) {
                  $uibModalInstance.close(record);
                }, function () {
                  $scope.closing = false;
                });
              };

              $scope.cancel = function () {
                $uibModalInstance.dismiss();
              };

            }
          });

          deviceModal.result.then(function (device) {
            $scope.devices.push(device);
          });
        };

        $scope.set_device_level = function (device) {
          return function (id, level) {
            device.$set_level(level);
          };
        };

        actions.forEach(function (action) {
          if (action.object_type !== 'devices') {
            return;
          }

          var defer = $q.defer();
          device_defers.push(defer.promise);

          Devices.get({'id': action.name}).$promise.then(function (record) {
            if (record.capabilities.indexOf('dimmer') >= 0) {
              record._level = action._level;
              $scope.devices.push(record);
            }
            defer.resolve();
          }, function () {
            defer.resolve();
          });
        });

        $q.all(device_defers).then(function () {
          $scope.loading = false;
          $timeout(function () {
              $scope.$broadcast('rzSliderForceRender');
          }, 100);
        });

        $scope.close = function () {
          $uibModalInstance.close($scope.devices);
        };

        $scope.cancel = function () {
          $uibModalInstance.dismiss();
        };
      }
    });

    builder.result.then(function (devices) {
      devices.forEach(function (device) {
        var matches = actions.filter(function (action) {
          return (action.name === device.name && action.object_type === 'devices');
        });

        if (matches.length > 0) {
          matches[0]._level = device._level;
          matches[0]._on = (device._level > 0);
          return;
        }

        actions.push({
          'name': device.name,
          'object_type': 'devices',
          'object_id': device._id,
          'stages': 0,
          '_level': device._level,
          '_on': (device._level > 0)
        });

      });
    });
  };

  $scope.editAction = function (action) {
    var assign = $uibModal.open({
      animation: true,
      templateUrl: 'views/scenes/edit.action.html',
      resolve: {
        selected: function () {
          return action;
        },
        action: function () {
          switch (action.object_type) {
            case 'devices':
              return devices.get(action.object_id);
            case 'rooms':
              return rooms.get(action.object_id);
            case 'scenes':
              return scenes.get(action.object_id);
            default:
              return undefined;
          }
        }
      },
      controller: function ($scope, $uibModalInstance, action, selected) {
        $scope.loading = true;
        $scope.device = action;
        $scope.selected = selected;
        $scope.selected_capabilities = [];

        Object.keys($scope.selected).forEach(function (k) {
          if (k[0] !== '_') {
            return;
          }
          $scope.device[k] = $scope.selected[k];
        });

        switch (selected.object_type) {
          case 'devices':
            $scope.selected_capabilities = $scope.device.capabilities;
            break;
          case 'scenes':
            $scope.selected_capabilities = ['light'];
            break;
          case 'scenes':
            $scope.selected_capabilities = ['dimmer', 'light'];
            break;
        }

        $scope.capabilities = angular.copy($scope.selected_capabilities).map(function (c) {
          return {
            'name': c,
            'view': 'views/devices/capabilities/' + c + '.html'
          };

        });

        $scope.controls = $scope.capabilities.filter(function (c) {

          return (c.name.indexOf('_sensor') === -1);

        });

        $scope.cancel = function () {
          $uibModalInstance.dismiss();
        };

        $scope.save = function () {

          if ($scope.has_capability('fan')) {
            $scope.selected._on = $scope.device._on;
          }
          if ($scope.has_capability('display')) {
            $scope.selected._on = $scope.device._on;
            $scope.selected._level = $scope.device._level;
            $scope.selected.locked = $scope.device.locked;
          }
          if ($scope.has_capability('light') && $scope.has_capability('dimmer')) {
            $scope.selected._on = $scope.device._on;
            $scope.selected._level = $scope.device._level;
          }
          if ($scope.has_capability('light') && !$scope.has_capability('dimmer')) {
            $scope.selected._on = $scope.device._on;
          }
          if ($scope.has_capability('lock')) {
            $scope.selected._on = $scope.device._on;
            $scope.selected._level = $scope.device._level;
          }
          if ($scope.has_capability('conditioner')) {
            $scope.selected._mode = $scope.device._mode;
            $scope.selected._set_point = $scope.device._set_point;
          }

          $uibModalInstance.close($scope.selected);
        };

        $scope.has_capability = function (capability) {
          var match = $scope.capabilities.filter(function (c) {

            return (c.name === capability);

          });

          return (match.length > 0);
        };



        $scope.stages_up = function () {
          if (isNaN($scope.selected.stages)) {
            $scope.selected.stages = 0;
          }
          if ($scope.selected.stages < 100){
            $scope.selected.stages += 1;
          }

        };

        $scope.stages_down = function () {
          if (isNaN($scope.selected.stages)) {
            $scope.selected.stages = 0;
          }
          if ($scope.selected.stages > 0){
            $scope.selected.stages -= 1;
          }
        };


        $scope.toggle_onoff = function () {

          $scope.processing = true;
          $scope.errors = false;
          $scope.device.locked = undefined;

          if ($scope.device._on) {
            $scope.device._on = false;
            $scope.device._level = 0;
          } else {
            $scope.device._on = true;
            $scope.device._level = 100;
          }
        };

        $scope.display_lock = function () {

          $scope.device.locked = true;
          $scope.device._level = undefined;
          $scope.device._on = undefined;

        };

        $scope.display_unlock = function () {

          $scope.device.locked = false;
          $scope.device._level = undefined;
          $scope.device._on = undefined;
          
        };

        $scope.lock = function () {

          $scope.device._on = true;
          $scope.device._level = 100;

        };

        $scope.unlock = function () {

          $scope.device._on = false;
          $scope.device._level = 0;
          
        };

        $scope.level_up = function () {
          $scope.device.locked = undefined;
          if (isNaN($scope.device._level)) {
            $scope.device._level = 0;
          }
          if ($scope.device._level < 100){
            $scope.device._level += 1;
          }
          $scope.device._on = true;

        };

        $scope.level_down = function () {
          $scope.device.locked = undefined;
          if (isNaN($scope.device._level)) {
            $scope.device._level = 0;
          }
          if ($scope.device._level > 0){
            $scope.device._level -= 1;
          }

          if ($scope.device._level === 0){
            $scope.device._on = false;
          }
        };

        $scope.set_mode = function (mode) {
          if (isNaN($scope.device._set_point)) {
            $scope.device._set_point = 58;
          }
          $scope.device._mode = mode;
        };

        $scope.temp_up = function () {
          if (isNaN($scope.device._set_point)) {
            $scope.device._set_point = 58;
          }
          $scope.device._set_point += 1;
        };

        $scope.temp_down = function () {
          if (isNaN($scope.device._set_point)) {
            $scope.device._set_point = 58;
          }
          $scope.device._set_point -= 1;
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

    assign.result.then(function (result) {
      action = result;

    });
  };

  $scope.addAction = function (step) {
    var assign = $uibModal.open({
      animation: true,
      templateUrl: 'views/scenes/add.action.html',
      resolve: {
        assigned: function () {

          return step.actions.map(function (obj) {return obj.name; });
        },
        devices: function (Devices) {
          return Devices.query().$promise;
        },
        scenes: function (Scenes) {
          return Scenes.query().$promise;
        },
        rooms: function (Rooms) {
          return Rooms.query().$promise;
        }
      },
      controller: function ($scope, $uibModalInstance, devices, scenes, rooms, assigned) {
        $scope.devices = devices;
        $scope.scenes = scenes;
        $scope.rooms = rooms;
        $scope.assigned = assigned;
        $scope.selected = {};
        $scope.selected_capabilities = [];



        $scope.action_types = [
          {name: 'Device', value: 'devices', icon: 'glyphicon glyphicon-oil'},
          {name: 'Room', value: 'rooms', icon: 'glyphicon glyphicon-modal-window', capabilities: ['light']},
          {name: 'Scene', value: 'scenes', icon: 'icon-picture', capabilities: ['light']},
        ];

        $scope.changeType = function (t) {
          $scope.selected.object_type = t.value;
          $scope.selected.object_id = undefined;
          $scope.selected_capabilities = t.capabilities;
        };

        $scope.changeItem = function (o) {
          $scope.selected.object_id = o._id;
          $scope.selected.stages = 0;
          $scope.selected.duration = 0;
          $scope.device = o;
          if (o.capabilities) {
            $scope.selected_capabilities = o.capabilities;
          }


          $scope.capabilities = angular.copy($scope.selected_capabilities).map(function (c) {
            return {
              'name': c,
              'view': 'views/devices/capabilities/' + c + '.html'
            };

          });

          $scope.controls = $scope.capabilities.filter(function (c) {

            return (c.name.indexOf('_sensor') === -1);

          });

        };

        $scope.cancel = function () {
          $uibModalInstance.dismiss();
        };

        $scope.selectDevice = function (device) {
          $scope.selected = {
            'stages': 0,
            'duration': 0
          };
          $scope.loading = true;

          devices.get(device.name).then(function(device) {
            $scope.loading = false;
            $scope.device = device;

            $scope.capabilities = angular.copy(device.capabilities).map(function (c) {
              return {
                'name': c,
                'view': 'views/devices/capabilities/' + c + '.html'
              };

            });

            $scope.controls = $scope.capabilities.filter(function (c) {

              return (c.name.indexOf('_sensor') === -1);

            });

          });

        };

        $scope.add = function () {
          $scope.selected.name = $scope.device.name;

          if ($scope.has_capability('fan')) {
            $scope.selected._on = $scope.device._on;
          }
          if ($scope.has_capability('display')) {
            $scope.selected._on = $scope.device._on;
            $scope.selected._level = $scope.device._level;
            $scope.selected.locked = $scope.device.locked;
          }
          if ($scope.has_capability('light') && $scope.has_capability('dimmer')) {
            $scope.selected._on = $scope.device._on;
            $scope.selected._level = $scope.device._level;
          }
          if ($scope.has_capability('light') && !$scope.has_capability('dimmer')) {
            $scope.selected._on = $scope.device._on;
          }
          if ($scope.has_capability('lock')) {
            $scope.selected._on = $scope.device._on;
            $scope.selected._level = $scope.device._level;
          }
          if ($scope.has_capability('conditioner')) {
            $scope.selected._mode = $scope.device._mode;
            $scope.selected._set_point = $scope.device._set_point;
          }

          $uibModalInstance.close($scope.selected);
        };

        $scope.has_capability = function (capability) {
          var match = $scope.capabilities.filter(function (c) {

            return (c.name === capability);

          });

          return (match.length > 0);
        };



        $scope.stages_up = function () {
          if (isNaN($scope.selected.stages)) {
            $scope.selected.stages = 0;
          }
          if ($scope.selected.stages < 100){
            $scope.selected.stages += 1;
          }

        };

        $scope.stages_down = function () {
          if (isNaN($scope.selected.stages)) {
            $scope.selected.stages = 0;
          }
          if ($scope.selected.stages > 0){
            $scope.selected.stages -= 1;
          }
        };


        $scope.toggle_onoff = function () {

          $scope.processing = true;
          $scope.errors = false;
          $scope.device.locked = undefined;

          if ($scope.device._on) {
            $scope.device._on = false;
            $scope.device._level = 0;
          } else {
            $scope.device._on = true;
            $scope.device._level = 100;
          }
        };

        $scope.lock = function () {
          
          $scope.device._on = true;
          $scope.device._level = 100;

        };

        $scope.unlock = function () {

          $scope.device._on = false;
          $scope.device._level = 0;
          
        };

        $scope.display_lock = function () {

          $scope.device.locked = true;
          $scope.device._level = undefined;
          $scope.device._on = undefined;

        };

        $scope.display_unlock = function () {

          $scope.device.locked = false;
          $scope.device._level = undefined;
          $scope.device._on = undefined;

        };

        $scope.level_up = function () {
          $scope.device.locked = undefined;
          if (isNaN($scope.device._level)) {
            $scope.device._level = 0;
          }
          if ($scope.device._level < 100){
            $scope.device._level += 1;
          }
          $scope.device._on = true;

        };

        $scope.level_down = function () {
          $scope.device.locked = undefined;
          if (isNaN($scope.device._level)) {
            $scope.device._level = 0;
          }
          if ($scope.device._level > 0){
            $scope.device._level -= 1;
          }

          if ($scope.device._level === 0){
            $scope.device._on = false;
          }
        };

        $scope.set_mode = function (mode) {
          if (isNaN($scope.device._set_point)) {
            $scope.device._set_point = 58;
          }
          $scope.device._mode = mode;
        };

        $scope.temp_up = function () {
          if (isNaN($scope.device._set_point)) {
            $scope.device._set_point = 58;
          }
          $scope.device._set_point += 1;
        };

        $scope.temp_down = function () {
          if (isNaN($scope.device._set_point)) {
            $scope.device._set_point = 58;
          }
          $scope.device._set_point -= 1;
        };

      }
    });

    assign.result.then(function (device) {
      step.actions = step.actions || [];
      step.actions.push(device);

    });
  };

  $scope.removeStep = function (index) {
    $scope.scene._steps.splice(index, 1);
  };

  $scope.save = function () {
    $scope.scene.$update().then(function () {
      abode.message({'type': 'success', 'message': 'Scene Saved'});
    }, function (err) {
      abode.message({'type': 'failed', 'message': 'Failed to save Scene', 'details': err});
      $scope.errors = err;
    });
  };

  $scope.remove = function () {
    confirm('Are you sure you want to remove this Scene?').then(function () {
      $scope.scene.$remove().then(function () {
        abode.message({'type': 'success', 'message': 'Scene Removed'});
        $state.go('main.scenes');
      }, function (err) {
        abode.message({'type': 'failed', 'message': 'Failed to remove Scene', 'details': err});
        $scope.errors = err;
      });
    });
  };

  $scope.removeRoom = function (id) {

    confirm('Are you sure?').then(function () {
      $scope.scene.$removeRoom(id).then(function () {
        getRooms();
        abode.message({'type': 'success', 'message': 'Room removed from Scene'});
      }, function (err) {
        abode.message({'type': 'failed', 'message': 'Failed to remove Room from Scene', 'details': err});
      });
    });

  };

  $scope.addRoom = function () {
    var assign = $uibModal.open({
      animation: true,
      templateUrl: 'views/scenes/assign.html',
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

      $scope.scene.$addRoom(room.name).then(function () {
        getRooms();
        abode.message({'type': 'success', 'message': 'Room added to Scene'});
      }, function () {
        abode.message({'type': 'failed', 'message': 'Failed to add Room to Scene', 'details': err});
      });

    });
  };

});

scenes.controller('scene', function () {

});
