var settings = angular.module('abode.settings', ['ui.router']);

settings.config(function($stateProvider, $urlRouterProvider) {

  $urlRouterProvider.when('/settings', '/settings/list');
  $urlRouterProvider.when('/settings/sources', '/settings/sources/list');

  $stateProvider
  .state('main.settings', {
    url: '/settings',
    templateUrl: '/views/settings/settings.html',
    controller: 'settings',
    resolve: {
      config: function (settings) {
        return settings.get_config();
      }
    }
  })
  .state('main.settings.list', {
    url: '/list',
    templateUrl: '/views/settings/settings.list.html',
    controller: function ($scope) {
      $scope.settings = [
        {'name': 'General', 'route': 'main.settings.general'},
        {'name': 'Home', 'route': 'main.settings.home'},
        {'name': 'Sources', 'route': 'main.settings.sources'},
        {'name': 'Sensors', 'route': 'main.settings.sensors'},
        {'name': 'Providers', 'route': 'main.settings.providers'},
        {'name': 'Display', 'route': 'main.settings.display'},
        {'name': 'Networking', 'route': 'main.settings.networking'},
        {'name': 'Advanced', 'route': 'main.settings.advanced'}
      ];
    }
  })
  .state('main.settings.general', {
    url: '/general',
    templateUrl: '/views/settings/settings.general.html',
    controller: 'settings',
    resolve: {
      config: function (settings) {
        return settings.get_config();
      }
    }
  })
  .state('main.settings.home', {
    url: '/home',
    templateUrl: '/views/settings/settings.home.html',
    controller: 'homeSettings',
  })
  .state('main.settings.sources', {
    url: '/sources',
    templateUrl: '/views/settings/settings.sources.html',
  })
  .state('main.settings.sources.list', {
    url: '/list',
    templateUrl: '/views/settings/settings.sources.list.html',
    controller: 'sourceSettings',
    resolve: {
      sources: function (settings) {
        return settings.get_sources();
      }
    }
  })
  .state('main.settings.sources.add', {
    url: '/add',
    templateUrl: '/views/settings/settings.sources.add.html',
    controller: 'addSourceSettings',
    resolve: {
      sources: function (settings) {
        return settings.get_sources();
      }
    }
  })
  .state('main.settings.sources.edit', {
    url: '/:name',
    templateUrl: '/views/settings/settings.sources.edit.html',
    controller: 'editSourceSettings',
    resolve: {
      'source': function ($stateParams, $state, settings) {

        return settings.get_source($stateParams.name);

      }
    }
  })
  .state('main.settings.sensors', {
    url: '/sensors',
    templateUrl: '/views/settings/settings.sensors.html',
  })
  .state('main.settings.providers', {
    url: '/providers',
    templateUrl: '/views/settings/settings.providers.html',
  })
  .state('main.settings.display', {
    url: '/display',
    templateUrl: '/views/settings/settings.display.html',
  })
  .state('main.settings.networking', {
    url: '/networking',
    templateUrl: '/views/settings/settings.networking.html',
  })
  .state('main.settings.advanced', {
    url: '/advanced',
    templateUrl: '/views/settings/settings.advanced.html',
  });
});

settings.service('settings', function ($q, $http, $templateCache, abode) {

  var get_sources = function () {
    var defer = $q.defer();

    $http.get(abode.url('/api/sources').value).then(function (response) {
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var get_source = function (name) {
    var defer = $q.defer();

    $http.get('/api/sources/' + name).then(function (response) {
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var save_source = function (source) {
    var defer = $q.defer();

    $http.put('/api/sources/' + source._id, source).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var add_source = function (source) {
    var defer = $q.defer();

    $http.post('/api/sources', source).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var remove_source = function (source) {
    var defer = $q.defer();

    $http.delete('/api/sources/' + source._id).then(function () {
      defer.resolve();
    }, function () {
      defer.reject();
    });

    return defer.promise;
  };

  var get_config = function (provider) {
    var defer = $q.defer();

    var url = (provider) ? '/api/abode/config/' + provider : '/api/abode/config';

    $http.get(abode.url(url).value()).then(function (response) {
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var save_config = function (provider, config) {
    var defer = $q.defer();


    var url = (provider) ? '/api/abode/config/' + provider : '/api/abode/config';

    $http.put(url, config).then(function (response) {
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var write_config = function () {
    var defer = $q.defer();

    $http.post('/api/abode/save').then(function (response) {
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var get_view = function () {
    var defer = $q.defer();

    $http.get('/api/abode/views/home.html').then(function (response) {
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  var save_view = function (view) {
    var defer = $q.defer();

    $http.put('/api/abode/views/home.html', view, {headers: {'Content-Type': 'text/plain'}}).then(function (response) {
      $templateCache.put('/api/abode/views/home.html', view);
      defer.resolve(response.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  return {
    get_config: get_config,
    save_config: save_config,
    write_config: write_config,
    get_view: get_view,
    save_view: save_view,
    get_sources: get_sources,
    get_source: get_source,
    save_source: save_source,
    add_source: add_source,
    remove_source: remove_source,
  };

});

settings.controller('sourceSettings', function ($scope, $state, abode, settings, sources) {
  $scope.sources = sources;

  $scope.view = function (source) {
    $state.go('index.settings.sources.edit', {'name': source.name});
  };

});

settings.controller('addSourceSettings', function ($scope, $state, abode, settings) {
  $scope.source = {};
  var notifier = abode.message;


  $scope.add = function () {
    settings.add_source($scope.source).then(function () {
      notifier.notify({'status': 'success', 'message': 'Source Added'});
      $scope.source = {};
    }, function (err) {
        notifier.notify({'status': 'failed', 'message': 'Failed to add Source', 'details': err});
      $scope.errors = err;
    });
  };

})
.controller('editSourceSettings', function ($scope, $state, abode, settings, source, confirm) {
  $scope.source = source;
  var notifier = abode.message;

  $scope.save = function () {
    settings.save_source($scope.source).then(function () {
      notifier.notify({'status': 'success', 'message': 'Source Saved'});
    }, function (err) {
        notifier.notify({'status': 'failed', 'message': 'Failed to save Source', 'details': err});
      $scope.errors = err;
    });
  };

  $scope.remove = function () {
    confirm('Are you sure you want to remove this Source?').then(function () {
      settings.remove_source($scope.source).then(function () {
        notifier.notify({'status': 'success', 'message': 'Source Removed'});
        $state.go('index.settings.sources.list');
      }, function (err) {
        notifier.notify({'status': 'failed', 'message': 'Failed to remove Source', 'details': err});
        $scope.errors = err;
      });
    });
  };

});

settings.controller('homeSettings', function ($scope, $state, abode, settings, Interfaces) {
  $scope.interface = '';
  $scope.interfaces = Interfaces.query();

  $scope.$watch('interface', function () {
    if ($scope.interface !== '') {
      Interfaces.get($scope.interface).then(function (view) {
        $scope.view = view;
      });
    } else {
      $scope.view = '';
    }
  });
  var notifier = abode.message;

  $scope.saveView = function () {


    Interfaces.save($scope.interface, $scope.view).then(function () {

      notifier({
        'type': 'success',
        'message': 'Home Template Saved'
      });

    }, function (err) {
      notifier({
        'type': 'failed',
        'message': 'Failed to Save Home Template',
        'details': err
      });
    });

  };
});

settings.controller('settings', function ($scope, $state, abode, settings, config) {
  var notifier = abode.message;
  $scope.config = config;
  $scope.state = $state;
  $scope.reload = function () {
    document.location.reload();
  };

  $scope.sensors = [
    {'name': 'Temperature/Humidity', 'route': 'index.settings.general'},
    {'name': 'Light', 'route': 'index.settings.home'},
    {'name': 'Motion', 'route': 'index.settings.sources'},
  ];

  $scope.providers = [
    {'name': 'Insteon PLM', 'route': 'index.settings.insteon'},
    {'name': 'Insteon Hub', 'route': 'index.settings.insteonhub'},
    {'name': 'Rad', 'route': 'index.settings.rad'},
    {'name': 'Wunderground', 'route': 'index.settings.wunderground'},
    {'name': 'IFTTT', 'route': 'index.settings.ifttt'},
    {'name': 'RadioThermostat', 'route': 'index.settings.radiothermostat'},
    {'name': 'Video', 'route': 'index.settings.video'},
  ];

  $scope.sources = [
    {'name': 'Muir', 'route': 'index.settings.insteon'},
  ];

  $scope.providerSettings = function (p) {
    $state.go(p);
  };

  $scope.save = function () {

    settings.save_config(undefined, $scope.config).then(function () {

      notifier.notify({
        'status': 'success',
        'message': 'Settings Saved'
      });

    }, function (err) {
      notifier.notify({
        'status': 'failed',
        'message': 'Settings Failed to Save',
        'details': err
      });
    });

  };

  $scope.write_config = function () {
    settings.write_config().then(function () {

      notifier.notify({
        'status': 'success',
        'message': 'Config Saved'
      });

    }, function (err) {

      notifier.notify({
        'status': 'failed',
        'message': 'Failed to Save Config',
        'details': err
      });

    });
  };
});
