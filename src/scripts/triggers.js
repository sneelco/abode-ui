var triggers = angular.module('abode.triggers', ['ui.router','ngResource']);

triggers.config(function($stateProvider, $urlRouterProvider) {
  $urlRouterProvider.when('/triggers', '/triggers/list');

  $stateProvider
  .state('main.triggers', {
    url: '/triggers',
    templateUrl: '/views/triggers/triggers.html',
  })
  .state('main.triggers.list', {
    url: '/list',
    templateUrl: '/views/triggers/triggers.list.html',
    controller: 'triggersList'
  })
  .state('main.triggers.add', {
    url: '/add',
    templateUrl: '/views/triggers/triggers.add.html',
    controller: 'triggersEdit',
    resolve: {
      'trigger': function () {

        return {'enabled': true, 'conditions': [], 'actions': []};

      },
      'types': function (triggers) {

        return triggers.types();

      }
    }
  })
  .state('main.triggers.edit', {
    url: '/:name',
    templateUrl: '/views/triggers/triggers.edit.html',
    controller: 'triggersEdit',
    resolve: {
      'trigger': function ($stateParams, $state, triggers) {

        return triggers.get($stateParams.name);

      },
      'types': function (triggers) {

        return triggers.types();

      }
    }
  });
});

triggers.service('triggers', function ($http, $q, $uibModal, $resource, abode, confirm, devices, rooms, scenes) {
  var model = $resource(abode.url('/api/triggers/:id/:action'), {id: '@_id'}, {
    'update': { method: 'PUT' },
  });

  var load = function (source) {
    var defer = $q.defer();

    model.query({'source': source}).$promise.then(function (results) {
      defer.resolve(results);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var getTypes = function () {
    var defer = $q.defer();

    $http.get('api/abode/triggers').then(function (response) {
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var addTrigger = function (config) {
    var defer = $q.defer();

    $http.post('/api/triggers', config).then(function (response) {
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var getTrigger = function (trigger) {
    var defer = $q.defer();

    $http({ url: '/api/triggers/' + trigger }).then(function (response) {
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var saveTrigger = function (trigger) {
    var defer = $q.defer();

    $http.put('/api/triggers/' + trigger._id, trigger).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var removeTrigger = function (trigger) {
    var defer = $q.defer();

    $http.delete('/api/triggers/' + trigger).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var removeAction = function (actions, index) {

    confirm('Are you sure you want to remove this Action?').then(function () {
      actions.splice(index, 1);
    });

  };

  var openAction = function (action, title) {

    return $uibModal.open({
      animation: true,
      templateUrl: 'views/triggers/triggers.action.html',
      size: 'lg',
      controller: function ($scope, $uibModalInstance, action, devices, rooms, scenes, title) {
        $scope.action = action;
        $scope.title = title;
        $scope.builder = {};
        $scope.type_args = [];
        $scope.devices = devices;
        $scope.rooms = rooms;
        $scope.scenes = scenes;
        $scope.alerts = [];


        $scope.action_types = [
          {name: 'Device', value: 'devices', icon: 'glyphicon glyphicon-oil'},
          {name: 'Room', value: 'rooms', icon: 'glyphicon glyphicon-modal-window', capabilities: ['light', 'dimmer', 'conditioner']},
          {name: 'Scene', value: 'scenes', icon: 'icon-picture', capabilities: ['light']},
          {name: 'Video', value: 'video', icon: 'icon-playvideo', capabilities: ['video']},
          {name: 'Display', value: 'display', icon: 'icon-monitor', capabilities: ['display']},
        ];

        $scope.type_actions = [
          {name: 'On', value: 'on', arguments: [], capabilities: ['light', 'dimmer', 'display', 'fan', 'onoff']},
          {name: 'Off', value: 'off', arguments: [], capabilities: ['light', 'dimmer', 'display', 'fan', 'onoff']},
          {name: 'Status', value: 'status', arguments: [], capabilities: ['light', 'dimmer', 'display', 'fan', 'onoff']},
          {name: 'Level', value: 'set_level', arguments: ['level'], capabilities: ['dimmer']},
          {name: 'Mode', value: 'set_mode', arguments: ['mode'], capabilities: ['conditioner']},
          {name: 'Temperature', value: 'set_point', arguments: ['temperature'], capabilities: ['conditioner']},
          {name: 'Play', value: 'play', arguments: ['url', 'duration'], capabilities: ['video']},
          {name: 'Stop', value: 'stop', arguments: [], capabilities: ['video']},
        ];

        var get_type = function (t) {
          var matches = $scope.action_types.filter(function (i) {
            return (i.value === t);
          });

          if (matches.length === 1) {
            return matches[0];
          }
        };

        var get_action = function (t) {
          var matches = $scope.type_actions.filter(function (i) {
            return (i.value === t);
          });

          if (matches.length === 1) {
            return matches[0];
          }
        };

        var get_by = function (key, obj, match) {
          var matches = obj.filter(function (i) {
            return (i[key] === match);
          });

          if (matches.length === 1) {
            return matches[0];
          }
        };

        var parser = function () {
          if (!action.name) { return; }
          var parts = action.name.split('.');
          if (parts.length === 3) {
            if (parts[0] === 'devices') {
              $scope.builder.item = get_by('name', $scope.devices, parts[1]);
            } else if (parts[0] === 'rooms') {
              $scope.builder.item = get_by('name', $scope.rooms, parts[1]);
            } else {
              $scope.builder.item = parts[1];
            }
            $scope.builder.type = parts[0];
            $scope.builder.action = parts[2];
          } else if (parts.length === 2) {
            $scope.builder.type = parts[0];
            $scope.builder.action = parts[1];
          }

          var a = get_action($scope.builder.action);
          $scope.type_args = a.arguments;

          var a_count = -1;

          a.arguments.forEach(function (a) {
            a_count += 1;
            if (a_count < $scope.action.args.length) {
              $scope.builder[a] = $scope.action.args[a_count];
            }
          });
        };

        parser();

        $scope.changeType = function (t) {
          $scope.builder.type = t;
          $scope.builder.item = undefined;
          $scope.builder.action = undefined;
        };
        $scope.changeItem = function (i) {
          $scope.builder.item = i;
          $scope.builder.action = undefined;
        };

        $scope.change_action = function (type) {
          $scope.builder.action = type.value;
          $scope.type_args = type.arguments;
        };

        $scope.has_capability = function (c) {
          var capabilities = [];
          var type = get_type($scope.builder.type);

          if (type && type.capabilities) {
            capabilities = type.capabilities;
          } else if (type && type.value === 'devices' && $scope.builder.item) {
            capabilities = $scope.builder.item.capabilities || [];
          }

          var has = false;

          capabilities.forEach(function (capability) {
            if (c.indexOf(capability) !== -1) {
              has = true;
            }
          });

          return has;
        };

        $scope.save = function () {
          var name = [];

          var isEmpty = function(val){
              return (val === undefined || val === null || val === '') ? true : false;
          };

          if (!$scope.builder.type) {
            $scope.alerts.push({'type': 'danger', 'msg': 'Missing action type'});
            return;
          }
          name.push($scope.builder.type);

          if ($scope.builder.item) {
            name.push($scope.builder.item.name);
          }

          if (!$scope.builder.action) {
            $scope.alerts.push({'type': 'danger', 'msg': 'Missing action'});
            return;
          }
          name.push($scope.builder.action);

          var a = get_action($scope.builder.action);
          if (!a) {
            $scope.alerts.push({'type': 'danger', 'msg': 'Invalid action'});
            return;
          }

          $scope.action.args = [];

          a.arguments.forEach(function (a) {
            var v = $scope.builder[a];

            if (isEmpty(v)) {
              $scope.alerts.push({'type': 'danger', 'msg': 'Missing argument: ' + a});
            } else {
              $scope.action.args.push(v);
            }
          });


          $scope.action.name = name.join('.');
          $uibModalInstance.close($scope.action);
        };
        $scope.cancel = function () {
          $uibModalInstance.dismiss();
        };

      },
      resolve: {
        action: function () {
          return action;
        },
        devices: function () {
          return devices.load();
        },
        rooms: function () {
          return rooms.load();
        },
        scenes: function () {
          return scenes.load();
        },
        title: function () {
          return title;
        },
      }
    });

  };

  var editAction = function (action) {
    var modal = openAction(action, 'Edit Action');
    modal.result.then(function (result) {
      action = result;
    });

  };

  var addAction = function (action) {
    var modal = openAction({'arguments': []}, 'Add Action');
    action = action || [];

    modal.result.then(function (result) {
      action.push(result);
    });
  };


  var openCondition = function (condition, title) {

    return $uibModal.open({
      animation: true,
      templateUrl: 'views/triggers/conditions.edit.html',
      size: 'lg',
      controller: function ($scope, $uibModalInstance, devices, rooms, scenes, title, condition) {
        $scope.title = title;
        $scope.condition = condition || {'and': [], 'or': []};
        $scope.devices = devices;
        $scope.left_capabilities = [];
        $scope.right_capabilities = [];
        $scope.rooms = rooms;
        $scope.scenes = scenes;
        $scope.condition_options = [
          {title: '<', value: 'lt'},
          {title: '≤', value: 'le'},
          {title: '=', value: 'eq'},
          {title: '≥', value: 'ge'},
          {title: '>', value: 'gt'},
          {title: '≠', value: 'ne'},
        ];

        if ($scope.condition.and && $scope.condition.and.length > 0) {
          $scope.type = 'and';
        } else if ($scope.condition.or && $scope.condition.or.length > 0) {
          $scope.type = 'or';
        } else {
          $scope.type = 'condition';
        }

        $scope.editCondition = editCondition;
        $scope.addCondition = addCondition;

        $scope.changeCondition = function (c) {
          $scope.condition.condition = c.value;
        };

        $scope.changeType = function (t) {
          if ($scope.type !== t) {
            $scope.type = t;
            $scope.condition = {'and': [], 'or': []};
          }
        };

        $scope.save = function () {
          if ($scope.type !== 'condition') {
            if ($scope.condition.and.length === 0 && $scope.condition.or.length === 0) {
              alert('Need at least one condition in the group');
              return;
            }

            if ($scope.condition.name === '') {
              alert('Name is required for groups');
              return;
            }
          } else {
            if (!$scope.condition.left_key || !$scope.condition.right_key || !$scope.condition.condition) {
              console.dir($scope.condition);
              alert('All condition values required');
              return;
            }
          }
          $uibModalInstance.close($scope.condition);
        };

        $scope.cancel = function () {
          $uibModalInstance.dismiss();
        };

      },
      resolve: {
        devices: function () {
          return devices.load();
        },
        rooms: function () {
          return rooms.load();
        },
        scenes: function () {
          return scenes.load();
        },
        title: function () {
          return title;
        },
        condition: function () {
          return condition;
        }
      }
    });

  };


  var editCondition = function (condition) {
    var modal = openCondition(condition, 'Edit Condition');
    modal.result.then(function (result) {
      condition = result;
    });

  };

  var addCondition = function (conditions) {
    var modal = openCondition({}, 'Add Condition');
    modal.result.then(function (result) {
      conditions.push(result);
    });
  };

  return {
    'load': load,
    'add': addTrigger,
    'get': getTrigger,
    'save': saveTrigger,
    'remove': removeTrigger,
    'editAction': editAction,
    'addAction': addAction,
    'removeAction': removeAction,
    'editCondition': editCondition,
    'addCondition': addCondition,
    'types': getTypes
  };
});

triggers.directive('conditions', function ($uibModal) {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      'value': '=',
      'type': '@',
      'name': '='
    },
    controller: function ($scope, triggers) {
      $scope.name = $scope;
      $scope.conditions = $scope.value;

      $scope.addCondition = triggers.addCondition;
      $scope.editCondition = triggers.editCondition;

      $scope.removeCondition = function (index) {
        $scope.value.splice(index, 1);
      };
    },
    templateUrl: '/views/triggers/triggers.conditions.html',
    replace: true,
  };
});

triggers.directive('conditionSide', function ($uibModal, devices, rooms, scenes) {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      'side': '@',
      'value': '=',
      'devices': '=',
      'rooms': '=',
      'scenes': '=',
    },
    controller: function ($scope) {
      $scope.expanded = true;
      $scope.capabilities = [];
      $scope.type = $scope.value[$scope.side + '_type'];
      $scope.obj = $scope.value[$scope.side + '_object'];
      $scope.key = $scope.value[$scope.side + '_key'];
      $scope.watched = {};

      if ($scope.type === 'devices') {
        devices.get($scope.obj).then(function (result) {
          $scope.capabilities = result.capabilities;
        });
      } else if ($scope.type !== 'devices' && $scope.type !== 'scenes' && $scope.type !== 'rooms') {
        $scope.watched.key = $scope.key;
      }

      $scope.condition_types = [
        {name: 'Device', value: 'devices', icon: 'glyphicon glyphicon-oil'},
        {name: 'Room', value: 'rooms', icon: 'glyphicon glyphicon-modal-window', capabilities: ['room']},
        {name: 'Scene', value: 'scenes', icon: 'icon-picture', capabilities: ['onoff']},
        {name: 'Video', value: 'video', icon: 'icon-playvideo', capabilities: ['video']},
        {name: 'Display', value: 'display', icon: 'icon-monitor', capabilities: ['display']},
        {name: 'Time', value: 'timeofday', icon: 'icon-clockalt-timealt'},
        {name: 'Date/Time', value: 'time', icon: 'icon-calendar', capabilities: ['time']},
        {name: 'Time is...', value: 'time.is', icon: 'icon-calendarthree', capabilities: ['time.is']},
        {name: 'Boolean', value: 'boolean', icon: 'icon-moonfirstquarter'},
        {name: 'Number', value: 'number', icon: 'icon-counter'},
        {name: 'String', value: 'string', icon: 'icon-textcursor'},
      ];

      $scope.condition_keys = [
        {name: 'Is On', value: 'is_on', arguments: [], capabilities: ['light', 'dimmer', 'display', 'fan', 'onoff']},
        {name: 'Is Off', value: 'is_off', arguments: [], capabilities: ['light', 'dimmer', 'display', 'fan', 'onoff']},
        {name: 'On Time', value: 'on_time', arguments: [], capabilities: ['light', 'dimmer', 'display', 'fan', 'onoff']},
        {name: 'Off Time', value: 'off_time', arguments: [], capabilities: ['light', 'dimmer', 'display', 'fan', 'onoff']},
        {name: 'Motion On', value: 'motion_on', arguments: [], capabilities: ['room']},
        {name: 'Motion Off', value: 'motion_off', arguments: [], capabilities: ['room']},
        {name: 'Lights On', value: 'lights_on', arguments: [], capabilities: ['room']},
        {name: 'Lights Off', value: 'lights_off', arguments: [], capabilities: ['room']},
        {name: 'Heat On', value: 'mode_heat', arguments: [], capabilities: ['room']},
        {name: 'Cool On', value: 'mode_cool', arguments: [], capabilities: ['room']},
        {name: 'Open', value: '_on', arguments: [], capabilities: ['door', 'window']},
        {name: 'Motion', value: '_on', arguments: [], capabilities: ['motion_sensor']},
        {name: 'Level', value: '_level', arguments: ['level'], capabilities: ['dimmer']},
        {name: 'Mode', value: '_mode', arguments: ['mode'], capabilities: ['conditioner']},
        {name: 'Set Point', value: '_set_point', arguments: ['temperature'], capabilities: ['conditioner']},
        {name: 'Temperature', value: '_temperature', arguments: ['temperature'], capabilities: ['temperature_sensor']},
        {name: 'Humidity', value: '_humidity', arguments: ['temperature'], capabilities: ['humidity_sensor']},
        {name: 'Lumacity', value: '_lumens', arguments: ['temperature'], capabilities: ['light_sensor']},
        {name: 'Current Time', value: 'time', arguments: [], capabilities: ['time']},
        {name: 'Day of Week', value: 'day', arguments: [], capabilities: ['time']},
        {name: 'Time of Sunset', value: 'sunset', arguments: [], capabilities: ['time']},
        {name: 'Time of Sunrise', value: 'sunrise', arguments: [], capabilities: ['time']},
        {name: 'Time of Noon', value: 'solar_noon', arguments: [], capabilities: ['time']},
        {name: 'Sunday', value: 'sunday', arguments: [], capabilities: ['time.is']},
        {name: 'Monday', value: 'monday', arguments: [], capabilities: ['time.is']},
        {name: 'Tuesday', value: 'tuesday', arguments: [], capabilities: ['time.is']},
        {name: 'Wednesday', value: 'wednesday', arguments: [], capabilities: ['time.is']},
        {name: 'Thursday', value: 'thursday', arguments: [], capabilities: ['time.is']},
        {name: 'Friday', value: 'friday', arguments: [], capabilities: ['time.is']},
        {name: 'Saturday', value: 'saturday', arguments: [], capabilities: ['time.is']},
        {name: 'Day', value: 'day', arguments: [], capabilities: ['time.is']},
        {name: 'Night', value: 'night', arguments: [], capabilities: ['time.is']},
      ];


      if ($scope.type !== 'devices') {
        $scope.condition_types.forEach(function (t) {
          if (t.value === $scope.type) {
            $scope.capabilities = t.capabilities;
          }
        });
      }

      $scope.$watch('watched', function (value) {
        if ($scope.obj) {
          return;
        }
        if ($scope.value[$scope.side + '_key'] !== value.key) {
          $scope.value[$scope.side + '_key'] = value.key;
        }
      }, true);

      $scope.toggle = function () {
        $scope.expanded = ($scope.expanded) ? false : true;
      };

      $scope.changeType = function (t) {
        $scope.capabilities = t.capabilities || [];
        $scope.value[$scope.side + '_type'] = t.value;
        $scope.value[$scope.side + '_object'] = undefined;
        $scope.value[$scope.side + '_key'] = undefined;
        $scope.watched.key = undefined;

        $scope.type = $scope.value[$scope.side + '_type'];
        $scope.obj = $scope.value[$scope.side + '_object'];
        $scope.key = $scope.value[$scope.side + '_key'];
      };
      $scope.changeItem = function (i) {
        if (i.capabilities) {
          $scope.capabilities = i.capabilities;
        }
        $scope.value[$scope.side + '_object'] = i.name;
        $scope.value[$scope.side + '_key'] = undefined;
        $scope.watched.key = undefined;

        $scope.obj = $scope.value[$scope.side + '_object'];
        $scope.key = $scope.value[$scope.side + '_key'];
      };
      $scope.changeKey = function (k) {
        $scope.value[$scope.side + '_key'] = k.value;
        $scope.watched.key = undefined;

        $scope.key = $scope.value[$scope.side + '_key'];
      };

      $scope.hasCapability = function (c) {
        var has = false;

        $scope.capabilities.forEach(function (capability) {
          if (c.indexOf(capability) !== -1) {
            has = true;
          }
        });

        return has;
      };
    },
    templateUrl: '/views/triggers/conditions.side.html',
    replace: true,
  };
});

triggers.controller('triggersList', function ($scope, $state, triggers, confirm) {
  $scope.triggers = [];
  $scope.loading = true;

  $scope.edit = function (trigger) {
    $state.go('index.triggers.edit', {name: trigger.name});
  };

  $scope.load = function () {
    triggers.load().then(function (triggers) {
      $scope.triggers = triggers;
      $scope.loading = false;
      $scope.error = false;
    }, function () {
      $scope.loading = false;
      $scope.error = true;
    });
  };

  $scope.remove = function (trigger) {
    confirm('Are you sure you want to remove this Trigger?').then(function () {
      triggers.remove(trigger._id).then(function () {
        $scope.load();
      }, function (err) {
        $scope.alerts = [{'type': 'danger', 'msg': 'Failed to remove Trigger'}];
        $scope.errors = err;
      });
    });
  };


  $scope.load();
});

triggers.controller('triggersEdit', function ($scope, $state, notifier, triggers, trigger, devices, rooms, confirm, types) {
  $scope.trigger = trigger;
  $scope.alerts = [];
  $scope.state = $state;
  $scope.trigger_types = types;
  $scope.devices = [];
  $scope.conditions = false;
  $scope.delay = ($scope.trigger.delay && $scope.trigger.delay.time > 0) ? true : false;
  $scope.duration = ($scope.trigger.duration && $scope.trigger.duration.time > 0) ? true : false;
  $scope.devices_loading = true;
  $scope.section = 'general';

  $scope.addAction = triggers.addAction;
  $scope.editAction = triggers.editAction;
  $scope.removeAction = triggers.removeAction;

  $scope.match_types = [
    {name: 'None', value: '', icon: 'glyphicon glyphicon-ban-circle'},
    {name: 'Device', value: 'device', icon: 'glyphicon glyphicon-oil'},
    {name: 'Room', value: 'room', icon: 'glyphicon glyphicon-modal-window'},
    {name: 'Time', value: 'time', icon: 'icon-clockalt-timealt'},
    {name: 'Date', value: 'date', icon: 'icon-calendar'},
    {name: 'String', value: 'string', icon: 'icon-quote'},
    {name: 'Number', value: 'number', icon: 'icon-infinityalt'}
  ];

  var getDevices = function () {
    $scope.devices_loading = true;
    devices.load().then(function (devices) {
      $scope.devices = devices;
      $scope.devices_loading = false;
    }, function () {
      $scope.devices = [];
      $scope.devices_loading = false;
    });
  };

  var getRooms = function () {
    $scope.rooms_loading = true;
    rooms.load().then(function (rooms) {
      $scope.rooms = rooms;
      $scope.rooms_loading = false;
    }, function () {
      $scope.rooms = [];
      $scope.rooms_loading = false;
    });
  };

  getDevices();
  getRooms();

  $scope.$watch('delay', function (type) {
    if (!type) {
      $scope.trigger.delay = {};
    }
  });

  $scope.$watch('duration', function (type) {
    if (!type) {
      $scope.trigger.duration = {'actions': [], 'triggers': []};
    }
  });

  $scope.$watch('trigger.match_type', function (type) {
    if (type === 'device' && $scope.devices.length === 0) {
      getDevices();
    }
    if (type === 'rooms' && $scope.devices.length === 0) {
      getRooms();
    }
  });

  $scope.changeType = function (type) {
    $scope.trigger.match_type = type;
    $scope.trigger.match = '';
  };

  $scope.changeDevice = function (device) {
    trigger.match = device.name;
  };

  $scope.changeRoom = function (room) {
    trigger.match = room.name;
  };

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

  $scope.save = function () {
    triggers.save($scope.trigger).then(function () {
      notifier.notify({'status': 'success', 'message': 'Trigger Saved'});
    }, function (err) {
      notifier.notify({'status': 'failed', 'message': 'Failed to save Trigger', 'details': err});
      $scope.errors = err;
    });
  };

  $scope.add = function () {
    triggers.add($scope.trigger).then(function () {
      $scope.trigger = {'enabled': true};
      notifier.notify({'status': 'success', 'message': 'Trigger Added'});
    }, function (err) {
      notifier.notify({'status': 'failed', 'message': 'Failed to add Trigger', 'details': err});
      $scope.errors = err;
    });
  };

  $scope.remove = function () {
    confirm('Are you sure you want to remove this Trigger?').then(function () {
      triggers.remove(trigger._id).then(function () {
        $state.go('index.triggers');
      }, function (err) {
        $scope.alerts = [{'type': 'danger', 'msg': 'Failed to remove Trigger'}];
        $scope.errors = err;
      });
    });
  };
});

triggers.controller('room', function () {

});

triggers.filter('conditionReadable', function () {
    return function (condition) {
      var left, right, cond;

      var formatSide = function (side) {
        var text,
          type = condition[side + '_type'],
          obj = condition[side + '_object'],
          key = condition[side + '_key'];


        if (['devices', 'scenes', 'rooms'].indexOf(type) != -1) {
          type = type.substr(0, type.length - 1);
          text = 'the ' + type + ' key ' + obj + '.' + key;
        } else if (type === 'boolean') {
          text = key;
        } else if (['string','number'].indexOf(type) !== -1) {
          text = 'the ' + type + ' "' + key + '"';
        } else {
          text = 'the ' + type + '.' + key;
        }

        return text;
      };

      if ((condition.and && condition.and.length > 0) || (condition.or && condition.or.length > 0)) {
        return condition.name;
      }

      left = formatSide('left');
      right = formatSide('right');

      switch (condition.condition) {
        case 'eq':
          cond = 'equal to';
          break;
        case 'ne':
          cond = 'not equal to';
          break;
        case 'lt':
          cond = 'less then';
          break;
        case 'le':
          cond = 'less then or equal to';
          break;
        case 'gt':
          cond = 'greater then';
          break;
        case 'ge':
          cond = 'greater then or equal to';
          break;
      }

      return 'If ' + left + ' is ' + cond + ' ' + right;
    };
});
