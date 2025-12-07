- Write new features in the docs

- ~~Merge Front-end~~
- Integrate AIS receive
- error on zoom. May need to `toRaw` all items being added to the map.

```
Uncaught TypeError: can't access property "_latLngToNewLayerPoint", this._map is null
    _animateZoom leaflet.js:10801
    fire leaflet.js:606
    _animateZoom leaflet.js:4814
    _tryAnimatedZoom leaflet.js:4792
    requestAnimFrame leaflet.js:244
    _tryAnimatedZoom leaflet.js:4789
    setView leaflet.js:3308
    setZoomAround leaflet.js:3362
    _performZoom leaflet.js:14186
    setTimeout handler*_onWheelScroll leaflet.js:14160
    handler leaflet.js:2799
    addOne leaflet.js:2814
    on leaflet.js:2725
    addHooks leaflet.js:14136
    enable leaflet.js:5914
    addHandler leaflet.js:3846
    init leaflet.js:392
    callInitHooks leaflet.js:359
    initialize leaflet.js:3269
    NewClass leaflet.js:302
    createMap leaflet.js:4863
    mounted App.vue:395
    createHook runtime-core.esm-bundler.js:2881
    callWithErrorHandling runtime-core.esm-bundler.js:199
    callWithAsyncErrorHandling runtime-core.esm-bundler.js:206
    __weh runtime-core.esm-bundler.js:2861
    flushPostFlushCbs runtime-core.esm-bundler.js:385
    render2 runtime-core.esm-bundler.js:6720
    mount runtime-core.esm-bundler.js:4004
    mount runtime-dom.esm-bundler.js:1826
    <anonymous> main.js:59
```

- آماده کنم، بدم برای این‌که چند نفر تستش کنن با تعداد زیاد سنسور.
