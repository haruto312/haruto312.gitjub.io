// ==UserScript==
// @name         Bing → Hitomi.la / Momon-ga 検索
// @namespace    local
// @version      1.1
// @match        https://www.bing.com/search*
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const DOMAIN_QUERY = 'site:hitomi.la OR site:momon-ga.com';

    const url = new URL(location.href);
    const query = url.searchParams.get('q');

    if (!query) return;

    // すでに site: が付いている場合は何もしない
    if (/\bsite:/i.test(query)) return;

    url.searchParams.set('q', `${query} ${DOMAIN_QUERY}`);

    location.replace(url.href);
})();
