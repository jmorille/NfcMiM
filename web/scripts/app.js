(function (window, document) {
    'use strict';

//  var navigator = window.navigator;
    // Install Service Worker
    //if (navigator.serviceWorker) {
    //  navigator.serviceWorker.register('/worker.js').then(function (reg) {
    //    console.log('◕‿◕', reg);
    //  }, function (err) {
    //    console.log('ಠ_ಠ', err);
    //  });
    //};

    // Polymer Ready Event
    document.addEventListener('WebComponentsReady', function () {
        // Perform some behaviour
        // console.log('Polymer is ready to rock!');
        console.log('%cWelcome to Red Sms!\n%cPrivate communication is the begin of the true liberty',
            'font-size:1.5em;color:#4558c9;', 'color:#d61a7f;font-size:1em;');
    });


    // Plugin Events
    document.addEventListener("deviceready", onDeviceReady, false);
    function onDeviceReady() {
        console.log('Plugins contacts : ', navigator.contacts !== undefined);
    }


// wrap document so it plays nice with other libraries
// http://www.polymer-project.org/platform/shadow-dom.html#wrappers
})(window, document);