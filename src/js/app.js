import $ from "jquery";

import html2canvas from "html2canvas";
import fileSaver from "file-saver";

require('bootstrap');
require('../less/styles.less');

(function() {
    const lenses = document.getElementById('lenses');
    const triggerRow = document.getElementById('trigger-row');
    const ribbon = document.getElementById('ribbon');
    const ribbonContainer = document.getElementById('ribbon-container');
    const form = document.getElementById('ribbonForm');

    let pixelBg;

    const focalLengths = [
        10,
        12,
        14,
        16,
        17,
        18,
        20,
        21,
        24,
        28,
        30,
        35,
        40,
        45,
        50,
        55,
        56,
        58,
        60,
        70,
        75,
        80,
        85,
        90,
        100,
        105,
        120,
        135,
        150,
        180,
        200,
        210,
        250,
        300,
        400,
        500,
        600
    ];

    const apertures = {
        '1.2': '#00B050',
        '1.8': '#92D050',
        '2.8': '#FFFF00',
        '4.0': '#FFC000',
        '>': '#FF0000'
    };

    /**
     * Create the ribbon based on the focal lengths and apertures.
     */
    function createRibbon() {
        const ribbonHead = ribbon.querySelector('thead > tr');
        const ribbonRows = ribbon.querySelectorAll('tbody > tr');

        for (let i = 0; i < focalLengths.length; i++) {
            const th = document.createElement('th');
            th.innerText = focalLengths[i];

            if (i === 0) {
                th.innerText = '<' + th.innerText;
            } else if (i === focalLengths.length - 1) {
                th.innerText = th.innerText + '+';
            }

            ribbonHead.appendChild(th);

            for (const row of ribbonRows) {
                row.appendChild(document.createElement('td'));
            }
        }

        // Resize ribbon container
        document.getElementById('ribbon-container').style.width = ribbon.offsetWidth + 'px';

        // Store original background colour
        pixelBg = ribbon.querySelector('tbody > tr > td:first-of-type').style.backgroundColor;

        // Update crop factor in ribbon
        ribbonContainer.querySelector('.cropfactor').innerHTML = form.elements.namedItem('cropfactor').value;
    }

    /**
     * Reset the ribbon to a clean state.
     */
    function resetRibbon() {
        const pixels = ribbon.querySelectorAll('tbody > tr > td');

        for (const pixel of pixels) {
            pixel.style.backgroundColor = pixelBg;
        }
    }

    /**
     * Update the ribbon with new data.
     */
    function updateRibbon(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (form.checkValidity() === false) {
            return;
        }

        // Reset ribbon to a clean state
        resetRibbon();

        const cropFactor = parseFloat(form.elements.namedItem('cropfactor').value);

        // Update crop factor in ribbon
        ribbonContainer.querySelector('.cropfactor').innerHTML = cropFactor.toString();

        // Walk through all lenses and fill the ribbon
        for (const lens of lenses.querySelectorAll('[id^=lens]')) {
            const i = lens.getAttribute('id').substr(4);

            const lensFrom = Math.ceil(parseInt(lens.querySelector('#from' + i).value) * cropFactor);
            const lensTo = Math.ceil(parseInt(lens.querySelector('#to' + i).value) * cropFactor);
            const lensAperture = parseFloat(lens.querySelector('#aperture' + i).value) * cropFactor;
            const lensQuality = parseInt(lens.querySelector('#quality' + i).value);

            let lensFromIndex;
            let lensToIndex;

            // Get focal length column indexes
            for (let x = 0; x < focalLengths.length; x++) {
                if (lensFromIndex === undefined && lensFrom <= focalLengths[x]) {
                    lensFromIndex = x;
                }

                if (lensToIndex === undefined && lensTo <= focalLengths[x]) {
                    lensToIndex = x;
                }
            }

            // Set max to last focal length
            lensFromIndex = lensFromIndex === undefined ? focalLengths.length - 1 : lensFromIndex;
            lensToIndex = lensToIndex === undefined ? focalLengths.length - 1 : lensToIndex;

            // Determine colour based on lens aperture
            let apertureColour;

            for (const [aperture, colour] of Object.entries(apertures)) {
                if (aperture === '>') {
                    apertureColour = colour;
                    break;
                }

                if (lensAperture <= parseFloat(aperture)) {
                    apertureColour = colour;
                    break;
                }
            }

            // Fill pixels
            for (let x = lensFromIndex; x <= lensToIndex; x++) {
                const pixel = ribbon.querySelector(`tbody > tr:nth-child(${lensQuality}) > td:nth-of-type(${x + 1})`);
                pixel.style.backgroundColor = apertureColour;
            }
        }
    }

    /**
     * Creates a new form row for lens input.
     *
     * @param focus The field to focus
     */
    function addLens(focus = 'from') {
        const rowIndex = lenses.children.length - 1;
        const lensRow = triggerRow.cloneNode(true);

        lensRow.setAttribute('id', 'lens' + rowIndex);


        // Replace label names
        const rowLabels = lensRow.querySelectorAll('label');

        for (const label of rowLabels) {
            label.setAttribute(
                'for',
                label.getAttribute('for').replace('New', rowIndex)
            );
        }

        // Replace input names and ids
        const rowInputs = lensRow.querySelectorAll('input,select');

        for (const input of rowInputs) {
            const newId = input.getAttribute('id').replace('New', rowIndex);

            input.setAttribute('id', newId);
            input.setAttribute('name', newId);
            input.setAttribute('required', 'required');
        }

        // Update minimum value for 'to'
        lensRow.querySelector('#from' + rowIndex).addEventListener('change', function() {
           lensRow.querySelector('#to' + rowIndex).setAttribute('min', this.value);
        });

        // Add close button
        const closeButton = lensRow.querySelector('button.close');

        closeButton.classList.remove('d-none');
        closeButton.addEventListener('click', function() {
            lenses.removeChild(lensRow);
        });

        // Add row
        triggerRow.before(lensRow);

        // Make active
        document.getElementById(focus + rowIndex).focus();
    }


    // Inputs that trigger a new row
    const triggerInputs = document.querySelectorAll('[id$="New"]');

    for (const input of triggerInputs) {
        input.addEventListener('focus', function() {
            addLens(input.getAttribute('id').replace('New', ''));
        });
    }

    // Save button handler
    document.querySelectorAll('#saveAsDropdown + .dropdown-menu > a').forEach((el) => {
        const type = el.getAttribute('data-type');
        let mime;

        switch (type) {
            case 'jpg' :
                mime = 'image/jpeg';
                break;
            case 'png':
                mime = 'image/png';
                break;
            case 'webp':
                mime = 'image/webp';
                break;
        }

        el.addEventListener('click', function() {
            updateRibbon();

            html2canvas(document.getElementById('ribbon-container')).then(canvas => {
               canvas.toBlob((blob) => {
                   fileSaver.saveAs(blob, 'ribbon.' + type);
               }, mime);
            });
        });
    });

    // Form submit
    document.getElementById('ribbonForm').addEventListener('submit', updateRibbon);

    // Create initial ribbon
    createRibbon();
})();
