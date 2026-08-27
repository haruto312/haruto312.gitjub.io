// ==UserScript==
// @name         Bing アフィリエイト・対象ドメイン除外
// @namespace    bing-affiliate-filter
// @version      5.0.0
// @description  Bing検索結果から対象ドメインおよび対象リンクを含むページを除外
// @match        https://www.bing.com/search*
// @grant        GM.xmlHttpRequest
// @connect      *
// @inject-into  content
// @run-at       document-idle
// ==/UserScript==

(() => {
    'use strict';


    // =========================================================
    // 設定
    // =========================================================

    /*
     * 検索結果から除外したいドメイン
     *
     * ここに追加するだけでOK
     */
    const BLOCKED_DOMAINS = [

        // DMM-mania
        'raw.dmm-mania.com',
        'raw2.dmm-mania.com',


        // -----------------------------------------
        // その他のアフィリエイト用ドメイン
        // -----------------------------------------

        'hb.afl.rakuten.co.jp',

        'ck.jp.ap.valuecommerce.com',

        'px.a8.net',

        'track.affiliate-b.com',

        't.afi-b.com',

        'h.accesstrade.net',

        'al.dmm.com',
        'al.dmm.co.jp'
    ];


    /*
     * Bing検索結果を調査する最大件数
     */
    const MAX_RESULTS = 10;


    /*
     * ページ取得のタイムアウト
     */
    const TIMEOUT = 15000;


    /*
     * 検索結果を調査する間隔
     */
    const CHECK_INTERVAL = 200;


    // =========================================================
    // デバッグパネル
    // =========================================================

    let panel;
    let summary;
    let resultArea;


    function createPanel() {

        panel =
            document.createElement('div');


        panel.id =
            'bing-affiliate-filter-panel';


        panel.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 2147483647;

            background: #111;
            color: #fff;

            padding: 10px 12px;

            font-family:
                -apple-system,
                BlinkMacSystemFont,
                sans-serif;

            font-size: 13px;
            line-height: 1.5;

            max-height: 55vh;
            overflow-y: auto;

            box-shadow:
                0 2px 10px rgba(0,0,0,.5);
        `;


        panel.innerHTML = `

            <div style="
                font-size:15px;
                font-weight:bold;
                margin-bottom:4px;
            ">
                🔎 Bing Filter
            </div>


            <div id="baf-summary">
                起動中…
            </div>


            <div id="baf-results"
                 style="margin-top:6px;">
            </div>


            <button id="baf-close"
                    style="
                        margin-top:8px;
                        padding:6px 12px;
                        border:0;
                        border-radius:5px;
                        background:#fff;
                        color:#111;
                    ">
                閉じる
            </button>
        `;


        document.documentElement.appendChild(
            panel
        );


        summary =
            panel.querySelector(
                '#baf-summary'
            );


        resultArea =
            panel.querySelector(
                '#baf-results'
            );


        panel.querySelector(
            '#baf-close'
        ).addEventListener(
            'click',
            () => {

                panel.remove();

            }
        );

    }


    function setSummary(text) {

        if (summary) {

            summary.textContent =
                text;

        }

    }


    function addResult(
        number,
        status,
        url = '',
        detail = ''
    ) {

        const item =
            document.createElement(
                'div'
            );


        item.style.cssText = `
            border-top:1px solid #444;
            padding:7px 0;
            word-break:break-all;
        `;


        item.innerHTML = `

            <div>
                <b>${number}.</b>
                ${escapeHTML(status)}
            </div>


            ${
                url
                ? `
                <div style="
                    font-size:10px;
                    color:#aaa;
                    margin-top:2px;
                    word-break:break-all;
                ">
                    ${escapeHTML(url)}
                </div>
                `
                : ''
            }


            ${
                detail
                ? `
                <div style="
                    font-size:10px;
                    color:#ffcc66;
                    margin-top:2px;
                    word-break:break-all;
                ">
                    ${escapeHTML(detail)}
                </div>
                `
                : ''
            }

        `;


        resultArea.appendChild(
            item
        );


        return item;

    }


    function escapeHTML(text) {

        return String(text)
            .replace(
                /&/g,
                '&amp;'
            )
            .replace(
                /</g,
                '&lt;'
            )
            .replace(
                />/g,
                '&gt;'
            )
            .replace(
                /"/g,
                '&quot;'
            )
            .replace(
                /'/g,
                '&#039;'
            );

    }


    // =========================================================
    // ドメイン判定
    // =========================================================

    function getHostname(url) {

        try {

            return new URL(
                url
            ).hostname.toLowerCase();

        } catch {

            return '';

        }

    }


    function isBlockedDomain(url) {

        const hostname =
            getHostname(url);


        if (!hostname) {
            return false;
        }


        for (
            const domain
            of BLOCKED_DOMAINS
        ) {

            const d =
                domain.toLowerCase();


            /*
             * 完全一致
             */

            if (
                hostname === d
            ) {

                return true;

            }


            /*
             * サブドメインも対象
             *
             * 例:
             *
             * xxx.raw.dmm-mania.com
             */

            if (
                hostname.endsWith(
                    '.' + d
                )
            ) {

                return true;

            }

        }


        return false;

    }


    // =========================================================
    // Bing検索結果取得
    // =========================================================

    function getResults() {

        /*
         * Bing通常検索結果
         */

        let results =
            Array.from(
                document.querySelectorAll(
                    'li.b_algo'
                )
            );


        /*
         * 別構造へのフォールバック
         */

        if (
            results.length === 0
        ) {

            results =
                Array.from(
                    document.querySelectorAll(
                        '#b_results > li'
                    )
                ).filter(
                    element =>
                        element.querySelector(
                            'a[href]'
                        )
                );

        }


        return results.slice(
            0,
            MAX_RESULTS
        );

    }


    // =========================================================
    // Bing検索結果URL取得
    // =========================================================

    function getResultURL(result) {

        /*
         * h2のリンクを優先
         */

        let links =
            Array.from(
                result.querySelectorAll(
                    'h2 a[href]'
                )
            );


        /*
         * h2が取れなかった場合
         * ブロック内の全リンクを調べる
         */

        if (
            links.length === 0
        ) {

            links =
                Array.from(
                    result.querySelectorAll(
                        'a[href]'
                    )
                );

        }


        for (
            const link
            of links
        ) {

            const href =
                link.href;


            if (!href) {
                continue;
            }


            try {

                const url =
                    new URL(
                        href
                    );


                /*
                 * Bing内部リンクを除外
                 */

                if (
                    url.hostname ===
                        'bing.com' ||

                    url.hostname.endsWith(
                        '.bing.com'
                    )
                ) {

                    continue;

                }


                /*
                 * 通常のHTTP/HTTPSのみ
                 */

                if (
                    url.protocol !==
                        'http:' &&

                    url.protocol !==
                        'https:'
                ) {

                    continue;

                }


                return url.href;

            } catch {}

        }


        return null;

    }


    // =========================================================
    // ページ取得
    // =========================================================

    async function requestPage(url) {

        try {

            const response =
                await GM.xmlHttpRequest({

                    method: 'GET',

                    url: url,

                    responseType: 'text',

                    timeout: TIMEOUT,

                    headers: {

                        'Accept':
                            'text/html,application/xhtml+xml'

                    }

                });


            if (
                response.status >= 200 &&
                response.status < 400
            ) {

                return response.responseText;

            }

        } catch {}

        return null;

    }


    // =========================================================
    // HTMLから対象リンクを検索
    // =========================================================

    function findBlockedLink(html) {

        if (!html) {
            return null;
        }


        const parser =
            new DOMParser();


        const doc =
            parser.parseFromString(
                html,
                'text/html'
            );


        // -----------------------------------------------------
        // <a href>
        // -----------------------------------------------------

        const links =
            doc.querySelectorAll(
                'a[href]'
            );


        for (
            const link
            of links
        ) {

            const href =
                link.getAttribute(
                    'href'
                );


            if (!href) {
                continue;
            }


            try {

                const absoluteURL =
                    new URL(
                        href,
                        doc.baseURI
                    ).href;


                if (
                    isBlockedDomain(
                        absoluteURL
                    )
                ) {

                    return absoluteURL;

                }

            } catch {}

        }


        // -----------------------------------------------------
        // <iframe src>
        // -----------------------------------------------------

        const iframes =
            doc.querySelectorAll(
                'iframe[src]'
            );


        for (
            const iframe
            of iframes
        ) {

            const src =
                iframe.getAttribute(
                    'src'
                );


            if (!src) {
                continue;
            }


            try {

                const absoluteURL =
                    new URL(
                        src,
                        doc.baseURI
                    ).href;


                if (
                    isBlockedDomain(
                        absoluteURL
                    )
                ) {

                    return absoluteURL;

                }

            } catch {}

        }


        return null;

    }


    // =========================================================
    // 検索結果を非表示
    // =========================================================

    function hideResult(result) {

        /*
         * Bing検索結果そのもの
         */

        result.style.setProperty(
            'display',
            'none',
            'important'
        );


        /*
         * 念のためvisibilityも設定
         */

        result.style.setProperty(
            'visibility',
            'hidden',
            'important'
        );


        /*
         * レイアウトから完全に消す
         */

        result.style.setProperty(
            'height',
            '0',
            'important'
        );


        result.style.setProperty(
            'min-height',
            '0',
            'important'
        );


        result.style.setProperty(
            'margin',
            '0',
            'important'
        );


        result.style.setProperty(
            'padding',
            '0',
            'important'
        );

    }


    // =========================================================
    // 1件チェック
    // =========================================================

    async function checkResult(
        result,
        index,
        total
    ) {

        const url =
            getResultURL(
                result
            );


        // -----------------------------------------------------
        // URL取得失敗
        // -----------------------------------------------------

        if (!url) {

            addResult(
                index,
                '❌ URL取得失敗'
            );


            return {
                checked: false,
                blocked: false
            };

        }


        // -----------------------------------------------------
        // URL自体が対象ドメイン
        // -----------------------------------------------------

        if (
            isBlockedDomain(
                url
            )
        ) {

            hideResult(
                result
            );


            addResult(
                index,
                '🚫 対象ドメイン → 非表示',
                url
            );


            return {
                checked: true,
                blocked: true
            };

        }


        // -----------------------------------------------------
        // ページ内容を取得
        // -----------------------------------------------------

        setSummary(
            `🔎 ${index}/${total} を調査中`
        );


        const item =
            addResult(
                index,
                '⏳ ページ取得中',
                url
            );


        const html =
            await requestPage(
                url
            );


        // -----------------------------------------------------
        // ページ取得失敗
        // -----------------------------------------------------

        if (!html) {

            item.innerHTML = `

                <b>${index}.</b>
                ⚠️ ページ取得失敗

                <div style="
                    font-size:10px;
                    color:#aaa;
                    margin-top:2px;
                    word-break:break-all;
                ">
                    ${escapeHTML(url)}
                </div>

            `;


            return {
                checked: false,
                blocked: false
            };

        }


        // -----------------------------------------------------
        // ページ内リンクを調査
        // -----------------------------------------------------

        const blockedURL =
            findBlockedLink(
                html
            );


        // -----------------------------------------------------
        // 対象リンク発見
        // -----------------------------------------------------

        if (blockedURL) {

            hideResult(
                result
            );


            item.innerHTML = `

                <b>${index}.</b>
                🚫 対象リンク検出 → 非表示

                <div style="
                    font-size:10px;
                    color:#aaa;
                    margin-top:2px;
                    word-break:break-all;
                ">
                    ${escapeHTML(url)}
                </div>

                <div style="
                    font-size:10px;
                    color:#ffcc66;
                    margin-top:2px;
                    word-break:break-all;
                ">
                    検出:
                    ${escapeHTML(
                        blockedURL
                    )}
                </div>

            `;


            return {
                checked: true,
                blocked: true
            };

        }


        // -----------------------------------------------------
        // 問題なし
        // -----------------------------------------------------

        item.innerHTML = `

            <b>${index}.</b>
            ✓ 対象リンクなし

            <div style="
                font-size:10px;
                color:#aaa;
                margin-top:2px;
                word-break:break-all;
            ">
                ${escapeHTML(url)}
            </div>

        `;


        return {
            checked: true,
            blocked: false
        };

    }


    // =========================================================
    // メイン
    // =========================================================

    async function main() {

        createPanel();


        setSummary(
            '🔎 Bing検索結果を確認中…'
        );


        /*
         * Bingの描画を待つ
         */

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    1000
                )
        );


        const results =
            getResults();


        // -----------------------------------------------------
        // 結果なし
        // -----------------------------------------------------

        if (
            results.length === 0
        ) {

            setSummary(
                '❌ Bing検索結果を検出できませんでした'
            );


            return;

        }


        const total =
            results.length;


        let checked = 0;
        let blocked = 0;
        let failed = 0;


        setSummary(
            `検索結果 ${total}件を調査します`
        );


        // -----------------------------------------------------
        // 順番に調査
        // -----------------------------------------------------

        for (
            let i = 0;
            i < total;
            i++
        ) {

            const result =
                await checkResult(
                    results[i],
                    i + 1,
                    total
                );


            if (
                result.checked
            ) {

                checked++;

            } else {

                failed++;

            }


            if (
                result.blocked
            ) {

                blocked++;

            }


            setSummary(
                `進捗 ${i + 1}/${total}　` +
                `確認 ${checked}件　` +
                `🚫 除外 ${blocked}件　` +
                `⚠️ 失敗 ${failed}件`
            );


            /*
             * 少し待つ
             */

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        CHECK_INTERVAL
                    )
            );

        }


        // -----------------------------------------------------
        // 完了
        // -----------------------------------------------------

        setSummary(
            `✅ 完了　` +
            `${checked}件確認　` +
            `🚫 ${blocked}件除外　` +
            `⚠️ ${failed}件失敗`
        );

    }


    // =========================================================
    // 実行
    // =========================================================

    main();

})();