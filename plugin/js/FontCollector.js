/*
    Fetches the image files
*/

"use strict";

/** class that handles custom fonts
 * urlIndex - track URLs associated with an ImageInfo
 * bitmapIndex - hashes of the image bitmaps, to allow us to eliminate duplicate images
 * imagesToFetch - images that need to be fetched from internet
 * imagesToPack - images to pack into epub
*/
class FontCollector {
    constructor() {
        this.reset();
        this.userPreferences = null;
    }

    reset() {
        this.FontInfoList = [];
        this.urlIndex = new Map();
        this.fontsToFetch = [];
        this.fontsToPack = [];
    }

    copyState(otherFontCollector) {
        this.FontInfoList = otherFontCollector.FontInfoList;
        this.urlIndex = otherFontCollector.urlIndex;
        this.fontsToFetch = otherFontCollector.fontsToFetch;
        this.fontsToPack = otherFontCollector.fontsToPack;
        this.userPreferences = otherFontCollector.userPreferences;
    }

    addFontInfo(sourceUrl, fileName) {
        let fontInfo = null;
        let index = this.urlIndex.get(sourceUrl);
        if (index === undefined) {
            index = this.urlIndex.get(fileName);
        }
        if (index === undefined) {
            index = this.fontInfoList.length;
            fontInfo = new FontInfo(sourceUrl, fileName);
            this.fontInfoList.push(imageInfo);
            this.fontsToFetch.push(imageInfo);
        }           
        this.urlIndex.set(sourceUrl, index);
        this.urlIndex.set(fileName, index);
        return;
    }

    onUserPreferencesUpdate(userPreferences) {
        this.userPreferences = userPreferences;
    }

    numberOfFontsToFetch() {
        return this.fontsToFetch.length;
    }

    async fetchFonts(pageParser) {
        for (let fontInfo of this.fontsToFetch) {
            if (!fontInfo.queuedForFetch) {
                fontInfo.queuedForFetch = true;
                await this.fetchFont(fontInfo, pageParser);
            }
        }
        this.imagesToFetch = [];
    }

    /**
    * @private
    */
    addToPackList(fontInfo) {
        let index = this.bitmapIndex.get(fontInfo.sourceUrl);
        if (index === undefined) {
            this.imagesToPack.push(imageInfo);
        } else {
            // duplicate bitmap, use previous version
            let wrongIndex = imageInfo.index;
            for (let [key, value] of this.urlIndex) {
                if (value === wrongIndex) {
                    this.urlIndex.set(key, index);
                }
            }
        }
    }

    findImagesUsedInDocument(content) {
        for (let imageElement of content.querySelectorAll("img")) {
            this.fixLazyLoadImageSource(imageElement);
            let src = this.findHighestResImage(imageElement);
            let wrappingElement = this.findImageWrappingElement(imageElement);
            let wrappingUrl = this.extractWrappingUrl(wrappingElement);
            let existing = this.imageInfoByUrl(wrappingUrl);
            if (existing == null) {
                let dataOrigFileUrl = this.findDataOrigFileUrl(imageElement, wrappingUrl);
                this.addImageInfo(wrappingUrl, src, dataOrigFileUrl, false);
            } else {
                existing.isOutsideGallery = true;
            }
        }
    }

    async fetchFont(fontInfo, pageParser) {
        try
        {
            let initialUrl = fontInfo.sourceUrl;
            this.urlIndex.set(initialUrl, imageInfo.index);
            let xhr = await pageParser.fetchFont(initialUrl);
            fontInfo.mediaType = xhr.contentType
            fontInfo.arraybuffer = xhr.arrayBuffer;
            this.addToPackList(fontInfo);
        }
        catch (error)
        {
            // ToDo, implement error handler.
            this.imagesToPack.push(imageInfo);
            ErrorLog.log(error);
        }
    }

    findImageFileUrlUsingDataOrigFileUrl(imageInfo) {
        return HttpClient.wrapFetch(imageInfo.dataOrigFileUrl).then(
            xhr => this.findImageFileUrl(xhr, imageInfo, null)
        );
    }
    
    imagesToPackInEpub() {
        return this.imagesToPack;
    }

    /** @private */
    static getExtensionFromUrlFilename(hyperlink) {
        let split = util.extractFilename(hyperlink).split(".");
        return (split.length < 2) ? "" : split[split.length - 1];
    }
}

//==============================================================