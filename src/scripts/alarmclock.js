var alarmclock = angular.module('abode.alarmclock', ['ngResource']);




alarmclock.factory('AlarmClocks', ['$resource', '$uibModal', 'abode', function ($resource, $uibModal, abode) {

  var model = $resource(abode.url('/api/alarmclocks/:id'), {id: '@_id'}, {
    'update': { method: 'PUT' },
    'refresh': { method: 'GET' },
  });

  model.prototype.$open = function () {
    var self = this;

    return $uibModal.open({
      animation: true,
      templateUrl: 'views/alarmclocks/edit.html',
      size: 'lg',
      controller: function ($scope, $uibModalInstance, triggers) {
        $scope.alarm = angular.copy(self);
        $scope.alarm.actions = $scope.alarm.actions || [];
        $scope.addAction = triggers.addAction;
        $scope.editAction = triggers.editAction;
        $scope.removeAction = triggers.removeAction;

        $scope.save = function () {
          $scope.alarm.$update().then(function (response) {
            $uibModalInstance.close(response);
          }, function (err) {
            console.dir(err);
          });

        };

        $scope.delete = function () {
          $scope.alarm.$delete().then(function (response) {
            $uibModalInstance.close();
          }, function (err) {
            console.dir(err);
          });

        };

        $scope.close = function () {
          $uibModalInstance.dismiss(self);
        };
      }
    });
  };

  model.add = function (base) {

    return $uibModal.open({
      animation: true,
      templateUrl: 'views/alarmclocks/add.html',
      size: 'lg',
      controller: function ($scope, $uibModalInstance, AlarmClocks, triggers) {
        $scope.alarm = new AlarmClocks(base);
        $scope.alarm.actions = $scope.alarm.actions || [];
        $scope.addAction = triggers.addAction;
        $scope.editAction = triggers.editAction;
        $scope.removeAction = triggers.removeAction;

        $scope.save = function () {
          $scope.alarm.$save().then(function (response) {
            $uibModalInstance.close(response);
          }, function () {
          });
        };

        $scope.close = function () {
          $uibModalInstance.dismiss();
        };
      }
    });
  };

  return model;

}]);

alarmclock.directive('alarmClocks', function () {  return {
    restrict: 'E',
    replace: true,
    scope: {
    },
    templateUrl: 'views/alarmclocks/list.html',
    controller: ['$scope', 'AlarmClocks', function ($scope, AlarmClocks) {
      $scope.AlarmClocks = AlarmClocks;
      $scope.alarms = AlarmClocks.query();

      $scope.open = function (alarm) {
        alarm.$open().result.then(function (result) {
          if (!result) {
            $scope.alarms = AlarmClocks.query();
          } else {
            alarm.$refresh();
          }
        });
      };

      $scope.add = function () {
        AlarmClocks.add({'name': 'Alarm #' + $scope.alarms.length, 'enabled': true}).result.then(function (result) {
            $scope.alarms = AlarmClocks.query();
        });
      };
    }]
  };
});
