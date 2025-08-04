"use strict";

// This is for the Fictioneer WordPress theme: https://github.com/Tetrakern/fictioneer

//dead urls
parserFactory.register("blossomtranslation.com", function() { return new FictioneerParser(); });
parserFactory.register("igniforge.com", function() { return new FictioneerParser(); });
parserFactory.register("razentl.com", function() { return new FictioneerParser(); });
//these still exist
parserFactory.register("emberlib731.xyz", function() { return new FictioneerParser(); });
parserFactory.register("lilyonthevalley.com", function() { return new LilyOnTheValleyParser(); });
parserFactory.register("novelib.com", function() { return new FictioneerParser(); });
parserFactory.register("springofromance.com", function() { return new FictioneerParser(); });
parserFactory.register("smeraldogarden.com", () => new FictioneerParser());

parserFactory.registerRule(
    (url, dom) => FictioneerParser.isFictioneerTheme(dom) * 0.7,
    () => new FictioneerParser()
);

class FictioneerParser extends Parser {
    constructor() {
        super();
    }

    static isFictioneerTheme(dom) {
        // the html tag has the class "fictioneer-theme"
        return (dom.querySelector("html.fictioneer-theme") !== null);
    }

    async getChapterUrls(dom) {
        let chapters = [];
        // Put free chapters first
        [...dom.querySelectorAll(".chapter-group__list ._publish a")].map(a => chapters.push(({
            sourceUrl: a.href,
            title: a.textContent?.trim(),
            isIncludeable: true
        })));
        // Put scheduled chapters after free and don't select them
        [...dom.querySelectorAll("._future a")].map(a => chapters.push(({
            sourceUrl: a.href,
            title: a.textContent?.trim(),
            isIncludeable: false
        })));

        if (chapters.length === 0) {
            chapters = [...dom.querySelectorAll(".chapter-group__list-item a")]
                .map(a => util.hyperLinkToChapter(a));
        }

        return chapters;
    }

    // the element holding chapter content
    findContent(dom) {
        const content =
            dom.querySelector(".chapter-formatting") ||
            dom.querySelector("#chapter-content");

        const footnotes = dom.querySelector(".chapter__footnotes");
        if (footnotes) { content.appendChild(footnotes); }

        return content;
    }

    // title of the story (not title of each chapter)
    extractTitleImpl(dom) {
        return dom.querySelector(".story__identity-title");
    }

    extractAuthor(dom) {
        let author =
            dom.querySelector("a.author").textContent ||
            dom.querySelector(".story__identity-meta").textContent;
        // remove "by " from the beginning if it exists
        author = author.replace(/^by /, "");
        return author;
    }

    // story description
    extractDescription(dom) {
        return dom.querySelector(".story__summary").textContent.trim();
    }

    findChapterTitle(dom) {
        // some sites use subtitles and chapter groups and info is lost without them
        let title = dom.querySelector(".chapter__title")?.textContent;
        let subtitle =
            dom.querySelector(".chapter__second-title")?.textContent ||
            dom.querySelector(".chapter__group")?.textContent;
        if (subtitle) { title += ": " + subtitle; }
        return title;
    }

    findCoverImageUrl(dom) {
        let img =
            dom.querySelector(".wp-post-image") ||
            dom.querySelector("figure.story__thumbnail img");
        return (img === null) ? img : img.src;
    }

    customRawDomToContentStep(chapter, content) {
        content.querySelectorAll("*").forEach(element => {
            if (element.tagName === "P") {
                element.removeAttribute("id");
                element.removeAttribute("data-paragraph-id");
            }
            // remove style attribute if style="font-weight: 400;" - it"s just noise
            if (element.hasAttribute("style") && element.getAttribute("style") === "font-weight: 400;") {
                element.removeAttribute("style");
            }
        });
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll("iframe, .eoc-chapter-groups, .chapter-nav, .related-stories-block"));
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".story__header, .story__summary")];
    }
}

class LilyOnTheValleyParser extends FictioneerParser {
    constructor() {
        super();
    }

    customRawDomToContentStep(chapter, content) {
        content.querySelectorAll("*").forEach(element => {
            // if it's a p tag and does not have attribute data-paragraph-id, remove it
            if (element.tagName === "P" && !element.hasAttribute("data-paragraph-id")) {
                element.remove();
            }

            // if it's a span, and it's content is only hexadecimal: `<span class="[^"]*">[a-f0-9]+</span>`
            if (element.tagName === "SPAN"
                && element.classList?.length === 1
                && /^[a-f0-9]+$/.test(element.textContent)) {
                element.remove();
            }
        });

        super.customRawDomToContentStep(chapter, content);
    }
}
