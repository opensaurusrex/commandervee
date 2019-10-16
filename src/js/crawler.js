/**
 * INSTRUCTIONS:
 *   1. Run a site scrape (using wget or equivalent) to load all the pages you
 *      wish to JSON-ify onto the localhost.
 *   2. Point line 11 of ./crawler.php to the folder containing all the *.html
 *      files.
 *   3. Open ./crawler.php in your browser and let the script run.
 *   4. Remove the trailing comma and manually add wrapper curly braces to
 *      json.txt.
 *   5. Enjoy your JSONified site. May be used in conjunction with
 *      ./custom-post-importer.php
 *
 *
 * MODIFICATIONS:
 *   To tweak this file to your specific needs, modify the extract*() functions
 *   to select the necessary elements.
 *
 *   In order to add fields, additional logic would also be required to
 *   ./custom-post-importer.
 */

document.addEventListener('DOMContentLoaded', () => {
	/**
	 * The selector for the page content
	 *
	 * @type {string}
	 */
	const PAGE_SELECTOR = '.body-container';

	/**
	 * Selector for the title
	 *
	 * @type {string}
	 */
	const TITLE_SELECTOR = '.body-container .hs_cos_wrapper_type_rich_text h1';

	/**
	 * Selector for all of the content, can be one or more sections.
	 * @type {string}
	 */
	const CONTENT_SELECTOR = '.body-container .hs_cos_wrapper_type_rich_text';

	/**
	 * List of files in the page
	 *
	 * @type {NodeListOf<Element>}
	 */
	const files = document.querySelectorAll('#file-collection .file');


	/**
	 * MAIN FUNCTIONS
	 */

	let JSONify = function (url, page) {
		try {
			$('#imported-content').load(url, function (responseText, textStatus, jqXHR) {
				if (textStatus === 'success') {
					// console.log('Processing ' + url);
					processData(page);
				} else {
					console.log('Could not load ' + url);
					$(files).eq(page.page_num + 1).trigger('JSONify');
				}
			});
		} catch(e) {
			console.log('Issue loading ' + url);
			console.log(e)
		}
	};


	let processData = function(page) {
		page.title = extractTitle();
		page.content = extractContent();
		page.attachments = extractAttachments();

		// page.author = extractAuthor();
		// page.author_slug = extractAuthorSlug();
		// page.publish_date = extractPublishDate();
		// page.featured_image = extractFeaturedImage();

		exportData(page);
	};


	let exportData = function(page) {
		let my_JSON = JSON.stringify(page);

		$.ajax({
			type: 'POST',
			url: 'json-to-file.php',
			data: {json: '"' + page.page_num + '"' + ':' + my_JSON + ','},
			dataType: 'json',
		});

		if (page.page_num+1 < files.length) {
			files.eq(page.page_num+1).trigger('JSONify');
		}
	};



	/**
	 * EXTRACTION FUNCTIONS
	 */

	let extractTitle = function() {
		let title = '';

		try {
			title = document.querySelector(TITLE_SELECTOR).innerText.trim();
		} catch {

		}

		return title;
	};

	let extractContent = function () {
		let content = '';

		try {
			let allContent = document.querySelectorAll(CONTENT_SELECTOR);

			allContent.forEach(element => content += element.innerHTML.trim());

			// Making sure that imports from MS Word do not cause issues due to ASCII limitations.
			content = content.replace(/[\u2018\u2019\u201A]/g, "\'");
			content = content.replace(/[\u201C\u201D\u201E]/g, "\"");
			content = content.replace(/\u2026/g, "...");
			content = content.replace(/[\u2013\u2014]/g, "-");
			content = content.replace(/\u02C6/g, "^");
			content = content.replace(/\u2039/g, "<");
			content = content.replace(/\u203A/g, ">");
			content = content.replace(/[\u02DC\u00A0]/g, " ");
			content = content.replace(/[^ -~]/g, '');
		} catch {
			console.log('Error in extracting content');
		}

		return content;
	};

	let extractAttachments = function () {
		let attachments = [];

		try {
			// Find downloadable files
			document.querySelectorAll('.body-container a').forEach(function (element) {
				let href = element.getAttribute('href');
				if (href.indexOf('doc.aspx') === 0) {
					let file = {
						'link': href,
						'title': $(this).text()
					}

					attachments.push(file);
				}
			});
			document.querySelectorAll('.body-container img').forEach(function (element) {
				let src = element.getAttribute('src');

				if (src.indexOf('image.aspx') === 0) {
					let image = {
						'link': src,
						'title': element.getAttribute('title') || ''
					}

					attachments.push(image);
				}
			});

		} finally {
			console.log(attachments);
		}

		return attachments;
	}

	let extractAuthor = function () {
		let author = '';

		try {
			author = document.querySelectorAll('.body-container .documentByLine a').innerText.trim()
				|| document.querySelector('.body-container .documentByLine').innerText.split('by')[1].trim();

		} finally {
			// TODO: Change this to a catch
		}

		return author;
	};

	let extractAuthorSlug = function () {
		let author_slug = '';

		try {
			author_url_bits = $('.body-container .documentByLine a').attr('href').split('/');
			author_slug = author_url_bits[author_url_bits.length-1];

		} finally {
			return author_slug;

		}
	};

	var extractPublishDate = function() {
		var date = '';

		try {
			date_string = $('.body-container .documentByLine').text().split('by')[0].trim();
			date = new Date(date_string);

		} finally {
			return date;

		}
	};

	var extractFeaturedImage = function() {
		var image = '';

		try {
			// attribute is ../image-mini. We want ../image, hence the slice.
			image = $('.body-container .newsImageContainer img').attr('src').slice(0,-5);

		} finally {
			return image;

		}

	};



	/**
	 * MAIN CODE
	 */

	var counter = 0;

	$('#file-collection .file').on('JSONify', function () {
		var this_page = {
			page_num		: counter,
			page_slug		: '',
			title			: '',
			author			: '',
			author_slug		: '',
			publish_date	: '',
			featured_image	: '',
			content			: '',
			attachments		: [],
			old_url			: $(this).attr('id'),
		};

		counter ++;

		JSONify($(this).attr('id') + ' ' + PAGE_SELECTOR, this_page);

	});

	$('#file-collection .file').first().trigger('JSONify');
});

