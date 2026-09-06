const FORM_CONFIG_URL = "./config/fields.yaml";
const SUBMISSION_API_URL = "https://affordance-sheet-api.t-apicella-cs.workers.dev";



/* =========================================
   LOAD YAML
========================================= */

async function loadFormConfiguration() {

    const response =
        await fetch(FORM_CONFIG_URL);

    if (!response.ok) {

        throw new Error(
            "Could not load fields.yaml"
        );

    }

    const yamlText =
        await response.text();

    return jsyaml.load(yamlText);

}



/* =========================================
   CREATE FIELD
========================================= */

function createField(field) {

    /* MARKDOWN */

    if (field.type === "markdown") {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "form-field form-field-markdown";

        const content =
            document.createElement("div");

        content.innerHTML =
            field.content;

        wrapper.appendChild(content);

        return wrapper;

    }



    const wrapper =
        document.createElement("div");

    wrapper.className =
        "form-field";

    if (field.show_if) {

        wrapper.dataset.showIf =
            field.show_if;

        wrapper.style.display = "none";

    }



    /* ---------- LABEL ---------- */

    let label;

    if (field.label) {

        label =
            document.createElement("label");

        label.htmlFor = field.id;

        label.textContent =
            field.label;

        wrapper.appendChild(label);

    }



    /* ---------- FIELD ---------- */

    let element;



    /* TEXT */

    if (
        field.type === "text" ||
        field.type === "email" ||
        field.type === "url" ||
        field.type === "number" ||
        field.type === "date"
    ) {

        element =
            document.createElement("input");

        element.type =
            field.type;

        element.id =
            field.id;

        element.name =
            field.id;

        if (field.placeholder) {

            element.placeholder =
                field.placeholder;

        }

    }



    /* TEXTAREA */

    else if (field.type === "textarea") {

        element =
            document.createElement("textarea");

        element.id =
            field.id;

        element.name =
            field.id;

        element.rows = 5;

        if (field.placeholder) {

            element.placeholder =
                field.placeholder;

        }

    }



    /* SELECT */

    else if (field.type === "select") {

        element =
            document.createElement("select");

        element.id =
            field.id;

        element.name =
            field.id;


        const emptyOption =
            document.createElement("option");

        emptyOption.value = "";

        emptyOption.textContent =
            "Select an option";

        element.appendChild(
            emptyOption
        );


        field.options.forEach(
            option => {

                const optionElement =
                    document.createElement("option");

                optionElement.value =
                    option;

                optionElement.textContent =
                    option;

                element.appendChild(
                    optionElement
                );

            }
        );

    }



    /* CHECKBOX */

    else if (field.type === "checkbox") {

        element =
            document.createElement("input");

        element.type =
            "checkbox";

        element.id =
            field.id;

        element.name =
            field.id;

    }



    /* PILLS */

    else if (field.type === "pills") {

        element =
            document.createElement("div");

        element.className =
            "pills-container";

        element.dataset.field =
            field.id;


        const pillsDisplay =
            document.createElement("div");

        pillsDisplay.className =
            "pills-display";

        element.appendChild(pillsDisplay);


        const addButton =
            document.createElement("button");

        addButton.type = "button";

        addButton.className =
            "pills-add-button";

        addButton.innerHTML = "+";

        addButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                showPillsMenu(
                    element,
                    field.options
                );

            }
        );

        element.appendChild(addButton);

    }



    /* RATING */

    else if (field.type === "rating") {

        element =
            document.createElement("div");

        element.className =
            "rating-stars";

        element.dataset.field =
            field.id;


        const max =
            field.max || 5;

        // built high-to-low so CSS row-reverse can fill stars left-to-right on hover
        for (let value = max; value >= 1; value--) {

            const starId =
                `${field.id}_${value}`;

            const input =
                document.createElement("input");

            input.type = "radio";

            input.id = starId;

            input.name = field.id;

            input.value = value;

            const starLabel =
                document.createElement("label");

            starLabel.htmlFor = starId;

            starLabel.textContent = "★";

            element.appendChild(input);

            element.appendChild(starLabel);

        }

    }



    /* TABLE */

    else if (field.type === "table") {

        element =
            document.createElement("div");

        element.className =
            "table-wrapper";

        element.dataset.field =
            field.id;


        const table =
            document.createElement("table");

        table.className = "data-table";


        const thead =
            document.createElement("thead");

        const headerRow =
            document.createElement("tr");

        field.headers.forEach(
            header => {

                const th =
                    document.createElement("th");

                th.textContent = header;

                headerRow.appendChild(th);

            }
        );

        thead.appendChild(headerRow);

        table.appendChild(thead);


        const tbody =
            document.createElement("tbody");

        function createTableRow(rowData = []) {

            const tr =
                document.createElement("tr");

            for (
                let i = 0;
                i < field.headers.length;
                i++
            ) {

                const td =
                    document.createElement("td");

                const input =
                    document.createElement("input");

                input.type = "text";

                input.value =
                    rowData[i] || "";

                input.className =
                    "table-cell-input";

                if (i === field.headers.length - 1) {

                    const cellInner =
                        document.createElement("div");

                    cellInner.className =
                        "table-last-cell-inner";

                    const removeBtn =
                        document.createElement("button");

                    removeBtn.type = "button";

                    removeBtn.className =
                        "table-delete-button";

                    removeBtn.textContent = "x";

                    removeBtn.title =
                        "Delete row";

                    removeBtn.addEventListener(
                        "click",
                        event => {

                            event.preventDefault();

                            tr.remove();

                        }
                    );

                    cellInner.appendChild(input);

                    cellInner.appendChild(removeBtn);

                    td.appendChild(cellInner);

                }

                else {

                    td.appendChild(input);

                }

                tr.appendChild(td);

            }

            return tr;

        }

        field.rows.forEach(
            rowData => {

                tbody.appendChild(
                    createTableRow(rowData)
                );

            }
        );

        const addRowBtn =
            document.createElement("tr");

        addRowBtn.className =
            "table-add-row";

        const addCell =
            document.createElement("td");

        addCell.colSpan =
            field.headers.length;

        const addBtn =
            document.createElement("button");

        addBtn.type = "button";

        addBtn.textContent = "+ Add row";

        addBtn.className =
            "table-add-button";

        addBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                tbody.insertBefore(
                    createTableRow(),
                    addRowBtn
                );

            }
        );

        addCell.appendChild(addBtn);

        addRowBtn.appendChild(addCell);

        tbody.appendChild(addRowBtn);

        table.appendChild(tbody);

        element.appendChild(table);

    }



    /* MULTISELECT */

    else if (field.type === "multiselect") {

        element =
            document.createElement("div");

        element.className =
            "multiselect";

        element.dataset.field =
            field.id;


        field.options.forEach(
            option => {

                const label =
                    document.createElement("label");

                label.className =
                    "choice";


                const checkbox =
                    document.createElement("input");

                checkbox.type =
                    "checkbox";

                checkbox.name =
                    field.id;

                checkbox.value =
                    option;


                const text =
                    document.createElement("span");

                text.textContent =
                    option;


                label.appendChild(
                    checkbox
                );

                label.appendChild(
                    text
                );

                element.appendChild(
                    label
                );

            }
        );

    }



    /* ---------- REQUIRED ---------- */

    if (
        field.required &&
        field.type !== "multiselect" &&
        field.type !== "checkbox" &&
        field.type !== "pills"
    ) {

        element.required = true;

    }



    /* ---------- CHECKBOX LAYOUT ---------- */

    if (field.type === "checkbox") {

        wrapper.classList.add(
            "form-field-checkbox"
        );

        wrapper.insertBefore(
            element,
            label
        );

    }

    else {

        wrapper.appendChild(element);

    }



    /* ---------- HELP TEXT ---------- */

    if (field.help && field.type !== "pills") {

        const help =
            document.createElement("small");

        help.className =
            "field-help";

        help.textContent =
            field.help;

        wrapper.appendChild(help);

    }



    return wrapper;

}



/* =========================================
   CREATE SECTION
========================================= */

function createSection(section) {

    const sectionElement =
        document.createElement("section");

    sectionElement.className =
        "form-section";

    sectionElement.id =
        section.id;



    /* ---------- HEADER ---------- */

    const header =
        document.createElement("div");

    header.className =
        "form-section-header";


    const title =
        document.createElement("h2");

    title.textContent =
        section.title;


    const description =
        document.createElement("p");

    description.textContent =
        section.description;


    header.appendChild(title);

    header.appendChild(description);

    sectionElement.appendChild(header);



    /* ---------- FIELDS ---------- */

    if (section.repeatable) {

        sectionElement.classList.add(
            "repeatable-section"
        );

        sectionElement.dataset.sectionId =
            section.id;

        const entries =
            document.createElement("div");

        entries.className =
            "repeatable-entries";

        let entryIndex = 0;

        const updateRemoveButtons = () => {

            const allEntries =
                entries.querySelectorAll(
                    ".repeatable-entry"
                );

            allEntries.forEach(
                entry => {

                    const removeButton =
                        entry.querySelector(
                            ".repeatable-remove-button"
                        );

                    if (!removeButton) return;

                    removeButton.disabled =
                        allEntries.length === 1;

                }
            );

        };

        const addEntry = () => {

            const entry =
                document.createElement("div");

            entry.className =
                "repeatable-entry";

            entry.dataset.entryIndex =
                String(entryIndex);

            const entryFields =
                document.createElement("div");

            entryFields.className =
                "form-fields";

            section.fields.forEach(
                field => {

                    const repeatedField = {
                        ...field,
                        id: `${field.id}__${entryIndex}`,
                        show_if:
                            field.show_if
                                ? `${field.show_if}__${entryIndex}`
                                : field.show_if
                    };

                    const fieldElement =
                        createField(repeatedField);

                    fieldElement.dataset.baseField =
                        field.id;

                    entryFields.appendChild(
                        fieldElement
                    );

                }
            );

            const actions =
                document.createElement("div");

            actions.className =
                "repeatable-entry-actions";

            const removeButton =
                document.createElement("button");

            removeButton.type = "button";

            removeButton.className =
                "repeatable-remove-button";

            removeButton.textContent =
                section.remove_button_label ||
                "Remove entry";

            removeButton.addEventListener(
                "click",
                () => {

                    entry.remove();

                    updateRemoveButtons();

                }
            );

            actions.appendChild(removeButton);

            entry.appendChild(entryFields);

            entry.appendChild(actions);

            entries.appendChild(entry);

            entryIndex += 1;

            updateRemoveButtons();

            setupConditionalVisibility(entry);

        };

        addEntry();

        const addMoreWrap =
            document.createElement("div");

        addMoreWrap.className =
            "repeatable-add-wrap";

        const addMoreButton =
            document.createElement("button");

        addMoreButton.type = "button";

        addMoreButton.className =
            "repeatable-add-button";

        addMoreButton.textContent =
            section.repeat_button_label ||
            "+ Add another entry";

        addMoreButton.addEventListener(
            "click",
            () => {

                addEntry();

            }
        );

        addMoreWrap.appendChild(addMoreButton);

        sectionElement.appendChild(entries);

        sectionElement.appendChild(addMoreWrap);

        return sectionElement;

    }

    const fields =
        document.createElement("div");

    fields.className =
        "form-fields";


    section.fields.forEach(
        field => {

            fields.appendChild(
                createField(field)
            );

        }
    );


    sectionElement.appendChild(fields);



    return sectionElement;

}



/* =========================================
   RENDER FORM
========================================= */

function renderForm(config) {

    const container =
        document.getElementById(
            "form-container"
        );


    config.sections.forEach(
        section => {

            container.appendChild(
                createSection(section)
            );

        }
    );

}






function addPill(container, value) {

    const pillsDisplay =
        container.querySelector(".pills-display");

    const pill =
        document.createElement("div");

    pill.className = "pill";

    pill.dataset.value = value;

    pill.innerHTML = `
        <span>${value}</span>
        <button type="button" class="pill-remove">×</button>
    `;

    pill.querySelector(".pill-remove")
        .addEventListener(
            "click",
            event => {

                event.preventDefault();

                pill.remove();

            }
        );

    pillsDisplay.appendChild(pill);

}


function showPillsMenu(container, options) {

    if (container._pillsCleanup) {

        container._pillsCleanup();

        return;

    }

    document
        .querySelectorAll(".pills-container")
        .forEach(
            pillsContainer => {

                if (
                    pillsContainer !== container &&
                    pillsContainer._pillsCleanup
                ) {

                    pillsContainer._pillsCleanup();

                }

            }
        );

    const selected =
        Array.from(
            container.querySelectorAll(".pill")
        ).map(
            pill => pill.dataset.value
        );

    const available =
        options.filter(
            opt => !selected.includes(opt)
        );

    if (available.length === 0) return;

    const addButton =
        container.querySelector(
            ".pills-add-button"
        );

    const menu =
        document.createElement("div");

    menu.className = "pills-menu";

    available.forEach(
        option => {

            const item =
                document.createElement("button");

            item.type = "button";

            item.className = "pills-menu-item";

            item.textContent = option;

            item.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    addPill(
                        container,
                        option
                    );

                    closeMenu();

                }
            );

            menu.appendChild(item);

        }
    );

    const closeMenu = () => {

        if (menu.isConnected) {

            menu.remove();

        }

        document.removeEventListener(
            "click",
            handleOutsideClick,
            true
        );

        document.removeEventListener(
            "keydown",
            handleEscape
        );

        window.removeEventListener(
            "scroll",
            handleScroll,
            true
        );

        addButton.setAttribute(
            "aria-expanded",
            "false"
        );

        container._pillsCleanup = null;

    };

    const handleOutsideClick = event => {

        if (
            !container.contains(
                event.target
            )
        ) {

            closeMenu();

        }

    };

    const handleEscape = event => {

        if (event.key === "Escape") {

            closeMenu();

        }

    };

    const handleScroll = () => {

        closeMenu();

    };

    addButton.parentNode.insertBefore(
        menu,
        addButton.nextSibling
    );

    addButton.setAttribute(
        "aria-expanded",
        "true"
    );

    document.addEventListener(
        "click",
        handleOutsideClick,
        true
    );

    document.addEventListener(
        "keydown",
        handleEscape
    );

    window.addEventListener(
        "scroll",
        handleScroll,
        true
    );

    container._pillsCleanup = closeMenu;

}



/* =========================================
   COLLECT FORM DATA
========================================= */

function collectFormData() {

    const form =
        document.getElementById(
            "affordance-form"
        );


    const data = {};

    const hasMeaningfulValue = value => {

        if (typeof value === "string") {
            return value.trim() !== "";
        }

        if (typeof value === "boolean") {
            return value;
        }

        if (Array.isArray(value)) {
            return value.some(
                item => hasMeaningfulValue(item)
            );
        }

        if (value && typeof value === "object") {
            return Object.values(value).some(
                item => hasMeaningfulValue(item)
            );
        }

        return value !== null && value !== undefined;

    };



    form.querySelectorAll(
        "input, textarea, select"
    ).forEach(
        element => {

            if (!element.name) {
                return;
            }

            if (
                element.name ===
                "cf-turnstile-response"
            ) {

                return;

            }

            if (
                element.closest(
                    ".repeatable-section"
                )
            ) {

                return;

            }

            if (
                element.type === "checkbox"
            ) {

                if (
                    !element.closest(".multiselect")
                ) {

                    data[element.name] =
                        element.checked;

                }

                return;

            }


            if (
                element.type === "radio"
            ) {

                if (element.checked) {

                    data[element.name] =
                        element.value;

                }

                return;

            }


            data[element.name] =
                element.value;

        }
    );



    /* ---------- MULTISELECT ---------- */

    document
        .querySelectorAll(".multiselect")
        .forEach(
            container => {

                const field =
                    container.dataset.field;


                const selected =
                    Array.from(
                        container.querySelectorAll(
                            "input[type='checkbox']:checked"
                        )
                    ).map(
                        checkbox =>
                            checkbox.value
                    );


                data[field] =
                    selected;

            }
        );


    /* ---------- PILLS ---------- */

    document
        .querySelectorAll(".pills-container")
        .forEach(
            container => {

                const field =
                    container.dataset.field;

                const selected =
                    Array.from(
                        container.querySelectorAll(
                            ".pill"
                        )
                    ).map(
                        pill =>
                            pill.dataset.value
                    );

                data[field] =
                    selected;

            }
        );


    /* ---------- TABLE ---------- */

    document
        .querySelectorAll(".table-wrapper")
        .forEach(
            wrapper => {

                if (
                    wrapper.closest(
                        ".repeatable-section"
                    )
                ) {

                    return;

                }

                const field =
                    wrapper.dataset.field;

                const table =
                    wrapper.querySelector(
                        ".data-table tbody"
                    );

                const rows =
                    Array.from(
                        table.querySelectorAll(
                            "tr:not(.table-add-row)"
                        )
                    ).map(
                        tr =>
                            Array.from(
                                tr.querySelectorAll(
                                    ".table-cell-input"
                                )
                            ).map(
                                input =>
                                    input.value
                            )
                    );

                data[field] = rows;

            }
        );


    /* ---------- REPEATABLE SECTIONS ---------- */

    document
        .querySelectorAll(
            ".repeatable-section"
        )
        .forEach(
            section => {

                const sectionId =
                    section.dataset.sectionId;

                const entries =
                    Array.from(
                        section.querySelectorAll(
                            ".repeatable-entry"
                        )
                    ).map(
                        entry => {

                            const entryData = {};

                            entry
                                .querySelectorAll(
                                    ".form-field[data-base-field]"
                                )
                                .forEach(
                                    fieldWrapper => {

                                        if (
                                            fieldWrapper.style.display ===
                                            "none"
                                        ) {

                                            return;

                                        }

                                        const baseField =
                                            fieldWrapper.dataset.baseField;

                                        const multiselect =
                                            fieldWrapper.querySelector(
                                                ".multiselect"
                                            );

                                        if (multiselect) {

                                            entryData[baseField] =
                                                Array.from(
                                                    multiselect.querySelectorAll(
                                                        "input[type='checkbox']:checked"
                                                    )
                                                ).map(
                                                    checkbox =>
                                                        checkbox.value
                                                );

                                            return;

                                        }

                                        const pillsContainer =
                                            fieldWrapper.querySelector(
                                                ".pills-container"
                                            );

                                        if (pillsContainer) {

                                            entryData[baseField] =
                                                Array.from(
                                                    pillsContainer.querySelectorAll(
                                                        ".pill"
                                                    )
                                                ).map(
                                                    pill =>
                                                        pill.dataset.value
                                                );

                                            return;

                                        }

                                        const tableWrapper =
                                            fieldWrapper.querySelector(
                                                ".table-wrapper"
                                            );

                                        if (tableWrapper) {

                                            entryData[baseField] =
                                                Array.from(
                                                    tableWrapper.querySelectorAll(
                                                        "tbody tr:not(.table-add-row)"
                                                    )
                                                ).map(
                                                    row =>
                                                        Array.from(
                                                            row.querySelectorAll(
                                                                ".table-cell-input"
                                                            )
                                                        ).map(
                                                            input =>
                                                                input.value
                                                        )
                                                );

                                            return;

                                        }

                                        const control =
                                            fieldWrapper.querySelector(
                                                "input, textarea, select"
                                            );

                                        if (!control) return;

                                        entryData[baseField] =
                                            control.type ===
                                            "checkbox"
                                                ? control.checked
                                                : control.value;

                                    }
                                );

                            return entryData;

                        }
                    ).filter(
                        entryData =>
                            hasMeaningfulValue(
                                entryData
                            )
                    );

                data[sectionId] = entries;

            }
        );


    return data;

}



/* =========================================
   SUBMIT
========================================= */

function setupFormSubmission() {

    const form =
        document.getElementById(
            "affordance-form"
        );

    const submitButton =
        form.querySelector(
            "button[type='submit']"
        );

    const markTouched = event => {

        const target = event.target;

        if (
            target &&
            target.matches("input[required], textarea[required], select[required]")
        ) {

            target.dataset.touched = "true";

        }

    };

    const updateSubmitButtonState = () => {

        const requiredControls =
            Array.from(
                form.querySelectorAll(
                    "input[required], textarea[required], select[required]"
                )
            ).filter(
                control =>
                    !control.closest(".form-field") ||
                    control.closest(".form-field").style.display !== "none"
            );

        const allRequiredEdited =
            requiredControls.every(
                control =>
                    control.dataset.touched === "true"
            );

        // keep the button clickable so an incomplete submit still reports what's missing
        submitButton.classList.toggle(
            "is-incomplete",
            !allRequiredEdited ||
                !form.checkValidity()
        );

    };

    form.addEventListener(
        "input",
        markTouched
    );

    form.addEventListener(
        "change",
        markTouched
    );

    form.addEventListener(
        "input",
        updateSubmitButtonState
    );

    form.addEventListener(
        "change",
        updateSubmitButtonState
    );

    updateSubmitButtonState();


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const message =
                document.getElementById(
                    "form-message"
                );

            message.classList.remove(
                "success",
                "error"
            );

            message.innerHTML = "";


            if (!form.checkValidity()) {

                const invalidControls =
                    Array.from(
                        form.querySelectorAll(":invalid")
                    ).filter(
                        control =>
                            !control.closest(".form-field") ||
                            control.closest(".form-field").style.display !== "none"
                    );

                const missingLabels =
                    invalidControls.map(
                        control => {

                            const fieldWrapper =
                                control.closest(".form-field");

                            const label =
                                fieldWrapper &&
                                fieldWrapper.querySelector("label");

                            return label
                                ? label.textContent.trim()
                                : control.name;

                        }
                    ).filter(
                        (label, index, all) =>
                            all.indexOf(label) === index
                    );

                message.innerHTML =
                    missingLabels.length
                        ? `<p><strong>Please complete the following field(s) before submitting:</strong></p>
                            <p>${missingLabels.join(", ")}</p>`
                        : "<p>Please complete the required fields before submitting.</p>";

                message.classList.add(
                    "error"
                );

                // native browser tooltip + focus/scroll on the first invalid field
                form.reportValidity();

                return;

            }


            const data =
                collectFormData();

            const turnstileInput =
                form.querySelector(
                    "input[name='cf-turnstile-response']"
                );

            const turnstileToken =
                turnstileInput
                    ? turnstileInput.value
                    : "";

            const turnstileWidget =
                form.querySelector(
                    ".cf-turnstile"
                );

            const siteKey =
                turnstileWidget
                    ? turnstileWidget.dataset.sitekey
                    : "";

            if (
                siteKey &&
                siteKey !== "YOUR_TURNSTILE_SITE_KEY" &&
                !turnstileToken
            ) {

                message.innerHTML =
                    "<p>Please complete the anti-bot verification first.</p>";

                message.classList.add(
                    "error"
                );

                return;

            }


            submitButton.disabled = true;

            message.innerHTML =
                "<p>Our team will check the form. Once this step is over, the Affordance Sheet will either be accepted and published on the catalogue, or you will be contacted via email to re-submit the form.</p>";

            message.classList.remove(
                "success",
                "error"
            );

            message.classList.add(
                "pending"
            );

            try {

                const response =
                    await fetch(
                        SUBMISSION_API_URL,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(
                                {
                                    ...data,
                                    turnstileToken
                                }
                            )
                        }
                    );

                const result =
                    await response.json();

                if (!response.ok || !result.success) {

                    const validationDetails =
                        result.errors
                            ? `<pre>${JSON.stringify(result.errors, null, 2)}</pre>`
                            : "";

                    throw new Error(
                        `${result.error || "Submission failed."}${validationDetails}`
                    );

                }

                message.innerHTML =
                    `<p><strong>Thank you for submitting the Affordance Sheet!</strong></p>
                    <p>Our team will check the form. Once this step is over, the Affordance Sheet will either be accepted and published on the catalogue, or you will be contacted via email to re-submit the form.</p>`;

                message.classList.remove(
                    "pending"
                );

                message.classList.add(
                    "success"
                );

                form.reset();

                form.querySelectorAll(
                    "[data-touched='true']"
                ).forEach(
                    control => {

                        delete control.dataset.touched;

                    }
                );

                if (
                    window.turnstile &&
                    typeof window.turnstile.reset === "function"
                ) {

                    window.turnstile.reset();

                }

                updateSubmitButtonState();

            }
            catch (error) {

                message.innerHTML =
                    `<p><strong>Submission failed.</strong></p><p>${error.message}</p>`;

                message.classList.remove(
                    "pending"
                );

                message.classList.add(
                    "error"
                );

                // the consumed/expired token can't be reused on retry
                if (
                    window.turnstile &&
                    typeof window.turnstile.reset === "function"
                ) {

                    window.turnstile.reset();

                }

            }
            finally {

                // updateSubmitButtonState no longer toggles disabled, so re-enable explicitly
                submitButton.disabled = false;

                updateSubmitButtonState();

                form.scrollIntoView === undefined ||
                    message.scrollIntoView(
                        { behavior: "smooth", block: "nearest" }
                    );

            }

        }
    );

}



function setupConditionalVisibility(root) {

    const scope =
        root ||
        document.getElementById(
            "affordance-form"
        );

    const conditionalFields =
        scope.querySelectorAll(
            "[data-show-if]"
        );

    conditionalFields.forEach(
        field => {

            // repeatable entries wire up their own conditional fields when created
            if (
                !root &&
                field.closest(".repeatable-section")
            ) {

                return;

            }

            const triggerId =
                field.dataset.showIf;

            // scope.querySelector works even before the section is attached to the document
            const trigger =
                scope.querySelector(
                    `#${CSS.escape(triggerId)}`
                );

            if (!trigger) return;

            const updateVisibility = () => {

                field.style.display =
                    trigger.checked
                        ? ""
                        : "none";

                if (
                    window.MathJax &&
                    window.MathJax.typesetPromise
                ) {

                    MathJax.typesetPromise();

                }

            };

            trigger.addEventListener(
                "change",
                updateVisibility
            );

            updateVisibility();

        }
    );

}



/* =========================================
   INITIALIZE
========================================= */

async function initialize() {

    try {

        const config =
            await loadFormConfiguration();


        renderForm(config);

        setupFormSubmission();

        setupConditionalVisibility();

        if (
            window.MathJax &&
            window.MathJax.typesetPromise
        ) {

            await MathJax.typesetPromise();

        }

    }
    catch (error) {

        console.error(error);


        document.getElementById(
            "form-container"
        ).innerHTML = `

            <div class="form-error">

                Unable to load the form
                configuration.

            </div>

        `;

    }

}


initialize();