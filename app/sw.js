/* globals self,caches,importScripts,RangedResponse,toolbox */

const OFFLINE_VIDEO_REGEX = /cdn\.jwplayer\.com\/videos\/(.)+\.mp4$/;

importScripts('sw-toolbox.js');
importScripts('ranged-request.js');

toolbox.options.cache.name = 'jw-showcase-v1';

toolbox.precache([
    '/',
    '/index.html',
    '/config.json',
    '/manifest.json',
    '/favicon.ico',
    '/styles/main.css',
    '/fonts/icons.eot',
    '/fonts/icons.svg',
    '/fonts/icons.ttf',
    '/fonts/icons.woff',
    '/scripts/scripts.js',
    '/scripts/application.js',
    '/scripts/vendor.1.js',
    '/scripts/vendor.2.js',
    '/scripts/vendor.3.js'
]);

toolbox.router.get('/(.*)', toolbox.cacheFirst, {origin: 'content.jwplatform.com'});
toolbox.router.get('/(.*)', toolbox.cacheFirst, {origin: 'assets-jpcust.jwpsrv.com'});
toolbox.router.get('/(.*)', toolbox.cacheFirst, {origin: 'ssl.p.jwpcdn.com'});

toolbox.router.get('/(.*)', function (request) {
    if (RangedResponse.isRangedRequest(request) && OFFLINE_VIDEO_REGEX.test(request.url)) {
        return RangedResponse.create(request);
    }
    return toolbox.cacheFirst(request);
}, {origin: 'cdn.jwplayer.com'});

toolbox.router.get('/(.*)', toolbox.cacheFirst);

// toolbox.router.default = toolbox.networkFirst;

self.onmessage = function (e) {

    var data = JSON.parse(e.data);

    // needs to be online!
    if (navigator.onLine) {
        if (data.type === 'prefetchPlayer') {
            prefetchPlayer(data.version);
        }
        else if (data.type === 'prefetchConfig') {
            prefetchConfig(data.config);
        }
    }
};

self.addEventListener('install', function (event) {
    return event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', function (event) {
    return event.waitUntil(self.clients.claim());
});

/**
 * @todo this should happen sooner, find a way to obtain latest player version?
 * @param version
 */
function prefetchPlayer (version) {

    var base = '//ssl.p.jwpcdn.com/player/v/' + version;

    prefetchUrl(base + '/provider.html5.js');
    prefetchUrl(base + '/provider.cast.js');
    prefetchUrl(base + '/jwpsrv.js');
    prefetchUrl(base + '/related.js');
    prefetchUrl(base + '/jw-icons.woff');
    prefetchUrl(base + '/jw-icons.ttf');
}

function prefetchConfig (config) {

    var base  = config.contentService,
        feeds = config.playlists || [];

    if (config.featuredPlaylist) {
        feeds.push(config.featuredPlaylist);
    }

    feeds.forEach(function (feedId) {
        prefetchUrl(base + '/v2/playlists/' + feedId);
    });

    if (config.bannerImage) {
        prefetchUrl(config.bannerImage.toString());
    }
}

function prefetchUrl (url) {
    return caches.open(toolbox.options.cache.name).then(function (cache) {
        return fetch(url).then(function (response) {
            return cache.put(url, response.clone()).then(function () {
                return response;
            });
        });
    });
}