"use strict";

parserFactory.register("chrysanthemumgarden.com", () => new ChrysanthemumgardenParser());

class ChrysanthemumgardenParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    populateUIImpl() {
        document.getElementById("passwordRow").hidden = false;
        document.getElementById("removeAuthorNotesRow").hidden = false; 
    }

    async fetchChapter(url) {
        let newDom = (await HttpClient.wrapFetch(url)).responseXML;
        let passwordForm = ChrysanthemumgardenParser.getPasswordForm(newDom);
        if (passwordForm) {
            let formData = ChrysanthemumgardenParser.makePasswordFormData(passwordForm);
            let options = {
                method: "POST",
                credentials: "include",
                body: formData
            };
            newDom = (await HttpClient.wrapFetch(url, {fetchOptions: options})).responseXML;
        }
        return newDom;
    }

    static getPasswordForm(dom) {
        return dom.querySelector("form#password-lock");
    }

    static makePasswordFormData(form) {
        let formData = new FormData();
        let password = document.getElementById("passwordInput").value; 
        formData.append("site-pass", password);
        formData.append("nonce-site-pass", ChrysanthemumgardenParser.getInputValue(form, "#nonce-site-pass"));
        formData.append("_wp_http_referer", ChrysanthemumgardenParser.getInputValue(form, "[name='_wp_http_referer']"));
        return formData;
    }

    preprocessRawDom(webPageDom) {
        let content = this.findContent(webPageDom);
        if (!this.userPreferences.removeAuthorNotes.value) {
            let notes = [...webPageDom.querySelectorAll("div.tooltip-container")];
            for (let n of notes) {
                content.appendChild(n);
            }
            this.addLinksToFootnotes(webPageDom);
        }
        util.resolveLazyLoadedImages(webPageDom, "img.br-lazy", "data-breeze");
    }

    static getInputValue(form, selector) {
        return form.querySelector("input" + selector).getAttribute("value");
    }

    addLinksToFootnotes(dom) {
        let makeLink = (id) => {
            let link = dom.createElement("a");
            link.href = "#" + id;
            return link;
        };

        let addParent = (newParent, element) => {
            element.replaceWith(newParent);
            newParent.appendChild(element);
        };

        let addIndexToSpan = (span, index) => {
            let sup = dom.createElement("sup");
            sup.textContent = index;
            span.appendChild(sup);
        };

        let addHyperlinkToSpan = (span, id) =>
            addParent(makeLink(id), span);

        let updateSpan = (span, index, id, backRef) => {
            addIndexToSpan(span, index);
            span.id = backRef;
            addHyperlinkToSpan(span, id);
        };

        let addIndexToFootnote = (title, index) =>
            title.prepend(dom.createTextNode(index + " "));

        let addHyperlinkToFootnote = (title, backRef) => {
            let link = makeLink(backRef);
            util.moveChildElements(title, link);
            title.appendChild(link);
        };

        let updateFootnote = (footnote, index, backRef) => {
            let title = footnote.querySelector(".tooltip-title");
            addIndexToFootnote(title, index);
            addHyperlinkToFootnote(title, backRef);
        };

        let spans = [...dom.querySelectorAll("span.tooltip-toggle")];
        let index = 0;
        for (let span of spans) {
            let id = span.getAttribute("tooltip-target");
            let footnote = dom.querySelector("#" + id);
            let backRef = "back-" + id;
            if (id) {
                ++index;
                updateSpan(span, index, id, backRef);
                updateFootnote(footnote, index, backRef);
            }
        }
    }
}
