// ==UserScript==
// @name         Bing → Hitomi.la 検索
// @namespace    local
// @version      1.0
// @match        https://www.bing.com/search*
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const DOMAIN = '(hitomi.la OR momon-ga.com');

    const url = new URL(location.href);
    const query = url.searchParams.get('q');

    if (!query) return;

    // 既に site: が付いている場合は変更しない
    if (/\bsite:/i.test(query)) return;

    url.searchParams.set('q', `${query} site:${DOMAIN}`);

    location.replace(url.href);
})();
