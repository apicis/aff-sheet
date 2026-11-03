const CATALOGUE_API_URL = "https://affordance-sheet-api.t-apicella-cs.workers.dev/catalogue";
const FALLBACK_EXPORT_FIELD_ORDER = [
    "Model name",
    "Access date",
    "Publication DOI",
    "Affordance task",
    "Modalities",
    "Human presence",
    "Datasets",
    "Weights link",
    "Code link",
    "Weights license",
    "Code license",
    "Model card",
    "Model card link",
    "Data splits",
    "Hyperparameters",
    "Augmentations",
    "Preprocessing",
    "Performance measures",
    "Robot deployment",
    "Robot platform",
    "Robot end-effector",
    "Robot setup",
    "Generalisation",
    "Robustness",
    "Safety"
];
const EXPORT_LINKED_FIELD_ORDER = {
    Datasets: ["Dataset name", "Dataset link", "Dataset license", "Dataset datasheet", "Dataset datasheet link"],
    "Performance measures": ["Metric", "Definition", "Limitations"],
    Preprocessing: ["Name", "Value"],
    Augmentations: ["Augmentation", "Range", "Probability"],
    "Data splits": ["Set", "Samples"],
    Hyperparameters: ["Name", "Value"]
};
const BOOLEAN_FIELDS = new Set([
    "Human presence",
    "Model card",
    "Robot deployment",
    "Dataset datasheet"
]);
const CARD_SECTION_DEFINITIONS = [
    ["📄 Overview", ["Access date", "Publication DOI"]],
    ["🧩 Affordance formulation", ["Affordance task", "Modalities", "Human presence"]],
    ["🗃️ Datasets", ["Datasets"]],
    ["🔬 Proposed method", ["Weights link", "Code link", "Weights license", "Code license", "Model card", "Model card link"]],
    ["⚙️ Experimental setup", ["Data splits", "Hyperparameters", "Augmentations", "Preprocessing"]],
    ["📈 Performance measures", ["Performance measures"]],
    ["🦾 Validation", ["Robot deployment", "Robot platform", "Robot end-effector", "Robot setup", "Generalisation", "Robustness", "Safety"]]
];
const EXPERIMENTAL_FIRST_COLUMN_NAMES = {
    "Data splits": "Data splits",
    Hyperparameters: "Hyperparameters",
    Preprocessing: "Preprocessing"
};
const SCHEMA_FIELD_TO_FORM_LABEL = {
    model_name: "Model name",
    access_date: "Access date",
    publication_doi: "Publication DOI",
    aff_tasks: "Affordance task",
    modalities: "Modalities",
    aff_human_presence: "Human presence",
    ds_name: "Dataset name",
    ds_record_link: "Dataset link",
    ds_licence: "Dataset license",
    ds_datasheet: "Dataset datasheet",
    ds_datasheet_url: "Dataset datasheet link",
    pm_record_link: "Weights link",
    pm_code_link: "Code link",
    pm_weights_license: "Weights license",
    pm_code_license: "Code license",
    pm_model_card: "Model card",
    pm_model_card_url: "Model card link",
    es_splits_df: "Data splits",
    es_hp_df: "Hyperparameters",
    es_augmentations_df: "Augmentations",
    es_resize: "Preprocessing",
    perf_description: "Metric",
    perf_formulation: "Definition",
    perf_limitations: "Limitations",
    rv_deployment: "Robot deployment",
    rv_platform: "Robot platform",
    rv_end_effector: "Robot end-effector",
    rv_setup: "Robot setup",
    rv_generalisation: "Generalisation",
    rv_robustness: "Robustness",
    rv_safety: "Safety"
};
let exportFieldOrder = FALLBACK_EXPORT_FIELD_ORDER;

const catalogueState = {
    records: [],
    selectedIds: new Set()
};

const catalogueElements = {
    search: document.querySelector("#catalogue-search"),
    task: document.querySelector("#catalogue-task"),
    modality: document.querySelector("#catalogue-modality"),
    dataset: document.querySelector("#catalogue-dataset"),
    clear: document.querySelector("#catalogue-clear"),
    download: document.querySelector("#catalogue-download"),
    status: document.querySelector("#catalogue-count"),
    tableWrap: document.querySelector(".catalogue-results-wrap"),
    results: document.querySelector("#catalogue-results"),
    comparisonBar: document.querySelector("#comparison-bar"),
    comparisonCount: document.querySelector("#comparison-count"),
    compare: document.querySelector("#compare-sheets"),
    dialog: document.querySelector("#comparison-dialog"),
    comparisonContent: document.querySelector("#comparison-content"),
    closeComparison: document.querySelector("#close-comparison")
};

function textValue(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    if (Array.isArray(value)) {
        return value.map(item => {
            if (item && typeof item === "object" && item.fields) {
                return Object.values(item.fields).map(textValue).join(" · ");
            }
            return textValue(item);
        }).join(", ");
    }

    if (typeof value === "object") {
        return Object.values(value).map(textValue).join(" · ");
    }

    return String(value);
}

function linkedNames(record, fieldName) {
    return (record.fields[fieldName] || []).map(item => {
        const firstValue = item.fields?.["Dataset name"] ?? Object.values(item.fields || {})[0];
        return textValue(firstValue);
    }).filter(value => value !== "—");
}

function uniqueFieldValues(fieldName) {
    return [...new Set(catalogueState.records.flatMap(record => {
        const value = record.fields[fieldName];
        return Array.isArray(value) ? value.filter(item => typeof item !== "object") : [];
    }))].sort((first, second) => first.localeCompare(second));
}

function populateSelect(select, values) {
    values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.append(option);
    });
}

function filteredRecords() {
    const query = catalogueElements.search.value.trim().toLowerCase();
    const task = catalogueElements.task.value;
    const modality = catalogueElements.modality.value;
    const dataset = catalogueElements.dataset.value;

    return catalogueState.records.filter(record => {
        const fields = record.fields;
        const searchable = textValue(fields).toLowerCase();
        return (!query || searchable.includes(query))
            && (!task || (fields["Affordance task"] || []).includes(task))
            && (!modality || (fields.Modalities || []).includes(modality))
            && (!dataset || linkedNames(record, "Datasets").includes(dataset));
    });
}

function orderExportFields(fields, fieldOrder) {
    const ordered = {};
    const keys = [...fieldOrder, ...Object.keys(fields)];

    [...new Set(keys)].forEach(fieldName => {
        if (Object.prototype.hasOwnProperty.call(fields, fieldName)) {
            ordered[fieldName] = fields[fieldName];
        }
    });

    return ordered;
}

async function loadExportFieldOrder() {
    try {
        const response = await fetch("./config/fields.yaml");
        if (!response.ok || typeof jsyaml === "undefined") {
            return;
        }

        const config = jsyaml.load(await response.text());
        const ids = config.sections
            .filter(section => section.id !== "feedback")
            .flatMap(section => section.fields.map(field => field.id));
        const fields = ids
            .map(fieldId => SCHEMA_FIELD_TO_FORM_LABEL[fieldId])
            .filter(Boolean);

        exportFieldOrder = [...new Set(fields)];
    }
    catch (error) {
        console.warn("Could not load form field order for JSON export", error);
    }
}

// Mapping from form field labels to schema field names
const FORM_LABEL_TO_SCHEMA_FIELD = {
    "Model name": "model_name",
    "Access date": "access_date",
    "Publication DOI": "publication_doi",
    "Affordance task": "aff_tasks",
    "Modalities": "modalities",
    "Human presence": "aff_human_presence",
    "Dataset name": "ds_name",
    "Dataset link": "ds_record_link",
    "Dataset license": "ds_licence",
    "Dataset datasheet": "ds_datasheet",
    "Dataset datasheet link": "ds_datasheet_url",
    "Weights link": "pm_record_link",
    "Code link": "pm_code_link",
    "Weights license": "pm_weights_license",
    "Code license": "pm_code_license",
    "Model card": "pm_model_card",
    "Model card link": "pm_model_card_url",
    "Data splits": "es_splits_df",
    "Hyperparameters": "es_hp_df",
    "Augmentations": "es_augmentations_df",
    "Preprocessing": "es_resize",
    "Metric": "perf_description",
    "Definition": "perf_formulation",
    "Limitations": "perf_limitations",
    "Robot deployment": "rv_deployment",
    "Robot platform": "rv_platform",
    "Robot end-effector": "rv_end_effector",
    "Robot setup": "rv_setup",
    "Generalisation": "rv_generalisation",
    "Robustness": "rv_robustness",
    "Safety": "rv_safety"
};

function convertToSchemaFormat(record) {
    /**
     * Convert record to hierarchical schema-compliant format.
     * Adds missing-value objects for:
     * - not_applicable: conditional fields whose trigger is false
     * - not_reported: missing required fields
     */
    const recordFields = record.fields || {};
    const flatSchema = {};

    // Conditional field dependencies: if condition is false, dependent fields are not_applicable
    const conditionalFields = {
        "ds_datasheet_url": { condition: "Dataset datasheet", conditionSchemaKey: "ds_datasheet" },
        "pm_model_card_url": { condition: "Model card", conditionSchemaKey: "pm_model_card" },
        "rv_platform": { condition: "Robot deployment", conditionSchemaKey: "rv_deployment" },
        "rv_end_effector": { condition: "Robot deployment", conditionSchemaKey: "rv_deployment" },
        "rv_setup": { condition: "Robot deployment", conditionSchemaKey: "rv_deployment" }
    };

    // Required fields from schema
    const requiredFields = [
        "model_name", "access_date", "publication_doi", "aff_tasks", "modalities",
        "aff_human_presence", "datasets", "pm_record_link", "pm_code_link",
        "pm_weights_license", "pm_code_license", "pm_model_card", "pm_model_card_url",
        "es_splits_df", "es_hp_df", "es_augmentations_df", "es_resize", "evaluation",
        "rv_deployment", "rv_platform", "rv_end_effector", "rv_setup",
        "rv_generalisation", "rv_robustness", "rv_safety"
    ];

    // Convert provided fields
    for (const [fieldLabel, fieldValue] of Object.entries(recordFields)) {
        const schemaKey = FORM_LABEL_TO_SCHEMA_FIELD[fieldLabel];
        
        if (!schemaKey) {
            continue; // Skip unmapped fields
        }

        // Handle different field types
        if (fieldLabel === "Datasets" && Array.isArray(fieldValue)) {
            // Convert each dataset object, ensuring all required dataset fields are present
            const requiredDatasetFields = ["ds_name", "ds_record_link", "ds_licence", "ds_datasheet", "ds_datasheet_url"];
            flatSchema[schemaKey] = fieldValue.map((item, index) => {
                const datasetObj = {};
                const itemFields = (item && item.fields) ? item.fields : {};
                
                // Convert provided dataset fields
                for (const [dLabel, dValue] of Object.entries(itemFields)) {
                    const dSchemaKey = FORM_LABEL_TO_SCHEMA_FIELD[dLabel];
                    if (dSchemaKey) datasetObj[dSchemaKey] = dValue;
                }
                
                // Add missing-value objects for missing dataset fields
                for (const requiredField of requiredDatasetFields) {
                    if (!(requiredField in datasetObj)) {
                        // Check if ds_datasheet_url should be not_applicable
                        if (requiredField === "ds_datasheet_url" && datasetObj.ds_datasheet === false) {
                            datasetObj[requiredField] = {
                                "status": "not_applicable",
                                "reason": "Dataset datasheet is false, so the URL does not apply."
                            };
                        } else {
                            datasetObj[requiredField] = {
                                "status": "not_reported",
                                "reason": "This dataset field was not provided in the submission."
                            };
                        }
                    }
                }
                
                return datasetObj;
            });
        } 
        else if (fieldLabel === "Performance measures" && Array.isArray(fieldValue)) {
            // Convert each metric object, ensuring all required metric fields are present
            const requiredMetricFields = ["perf_description", "perf_formulation", "perf_limitations"];
            flatSchema[schemaKey] = fieldValue.map((item, index) => {
                const metricObj = {};
                const itemFields = (item && item.fields) ? item.fields : {};
                
                // Convert provided metric fields
                for (const [mLabel, mValue] of Object.entries(itemFields)) {
                    const mSchemaKey = FORM_LABEL_TO_SCHEMA_FIELD[mLabel];
                    if (mSchemaKey) metricObj[mSchemaKey] = mValue;
                }
                
                // Add missing-value objects for missing metric fields
                for (const requiredField of requiredMetricFields) {
                    if (!(requiredField in metricObj)) {
                        metricObj[requiredField] = {
                            "status": "not_reported",
                            "reason": "This metric field was not provided in the submission."
                        };
                    }
                }
                
                return metricObj;
            });
        }
        else if (["Data splits", "Hyperparameters", "Augmentations", "Preprocessing"].includes(fieldLabel)) {
            // Convert table format: [{ fields: { "Set": "...", "Samples": "..." } }] → [["...", ""]]
            if (Array.isArray(fieldValue)) {
                flatSchema[schemaKey] = fieldValue
                    .filter(row => row && row.fields)
                    .map(row => Object.values(row.fields));
            }
        }
        else {
            // Simple value copy (may already include missing-value objects if stored)
            flatSchema[schemaKey] = fieldValue;
        }
    }

    // Add not_applicable for conditional fields whose condition is false
    for (const [fieldLabel, condInfo] of Object.entries(conditionalFields)) {
        const conditionValue = flatSchema[condInfo.conditionSchemaKey];
        
        // If condition is explicitly false, dependent field must be not_applicable
        if (conditionValue === false) {
            if (fieldLabel) {
                flatSchema[fieldLabel] = {
                    "status": "not_applicable",
                    "reason": `${condInfo.condition} is false, so this field does not apply.`
                };
            }
        }
    }

    // Add not_reported for missing required fields
    for (const requiredField of requiredFields) {
        if (!(requiredField in flatSchema)) {
            flatSchema[requiredField] = {
                "status": "not_reported",
                "reason": "This field was not provided in the submission."
            };
        }
    }

    // Convert flat schema to hierarchical structure
    const hierarchicalSchema = {
        overview: {
            model_name: flatSchema.model_name,
            access_date: flatSchema.access_date,
            publication_doi: flatSchema.publication_doi
        },
        formulation: {
            aff_tasks: flatSchema.aff_tasks,
            modalities: flatSchema.modalities,
            aff_human_presence: flatSchema.aff_human_presence
        },
        datasets: {
            datasets: flatSchema.datasets
        },
        method: {
            pm_record_link: flatSchema.pm_record_link,
            pm_code_link: flatSchema.pm_code_link,
            pm_weights_license: flatSchema.pm_weights_license,
            pm_code_license: flatSchema.pm_code_license,
            pm_model_card: flatSchema.pm_model_card,
            pm_model_card_url: flatSchema.pm_model_card_url
        },
        setup: {
            es_splits_df: flatSchema.es_splits_df,
            es_hp_df: flatSchema.es_hp_df,
            es_augmentations_df: flatSchema.es_augmentations_df,
            es_resize: flatSchema.es_resize
        },
        measures: {
            evaluation: flatSchema.evaluation
        },
        validation: {
            rv_deployment: flatSchema.rv_deployment,
            rv_platform: flatSchema.rv_platform,
            rv_end_effector: flatSchema.rv_end_effector,
            rv_setup: flatSchema.rv_setup,
            rv_generalisation: flatSchema.rv_generalisation,
            rv_robustness: flatSchema.rv_robustness,
            rv_safety: flatSchema.rv_safety
        }
    };

    return hierarchicalSchema;
}

function exportRecord(record) {
    // Convert to schema format for download
    return convertToSchemaFormat(record);
}

function updateComparisonBar() {
    const count = catalogueState.selectedIds.size;
    catalogueElements.comparisonBar.hidden = count === 0;
    catalogueElements.comparisonCount.textContent = `${count} sheet${count === 1 ? "" : "s"} selected`;
    catalogueElements.compare.disabled = count < 2;
}

function downloadRecord(record) {
    const schemaData = exportRecord(record);
    const json = JSON.stringify(schemaData, null, 2);
    const blobUrl = URL.createObjectURL(new Blob([json], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    const modelName = record.fields["Model name"] || "affordance-sheet";
    link.href = blobUrl;
    link.download = `${String(modelName).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}

function downloadRecords(records) {
    const publicRecords = records.map(exportRecord);
    const json = JSON.stringify(publicRecords, null, 2);
    const blobUrl = URL.createObjectURL(new Blob([json], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "affordance-sheets.json";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}

function appendBadges(container, values, className) {
    values.forEach(value => {
        const badge = document.createElement("span");
        badge.className = className;
        badge.textContent = value;
        container.append(badge);
    });
}

function appendStatusCheckbox(container, checked, label) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(checked);
    checkbox.disabled = true;
    checkbox.setAttribute("aria-label", `${label}: ${checkbox.checked ? "yes" : "no"}`);
    container.append(checkbox);
}

function appendLinkedTable(container, fieldName, records) {
    const table = document.createElement("table");
    table.className = `catalogue-field-table ${fieldName === "Datasets" || fieldName === "Performance measures" ? "catalogue-wide-table" : ""}`.trim();
    const fieldNames = EXPORT_LINKED_FIELD_ORDER[fieldName]
        || [...new Set(records.flatMap(record => Object.keys(record.fields || {})))];
    const head = document.createElement("thead");
    const headingRow = document.createElement("tr");
    fieldNames.forEach((childField, childIndex) => {
        const heading = document.createElement("th");
        heading.textContent = childIndex === 0
            ? (EXPERIMENTAL_FIRST_COLUMN_NAMES[fieldName] || childField)
            : childField;
        headingRow.append(heading);
    });
    head.append(headingRow);

    const body = document.createElement("tbody");
    records.forEach(record => {
        const row = document.createElement("tr");
        fieldNames.forEach(childField => {
            const cell = document.createElement("td");
            const value = record.fields?.[childField];

            if (typeof value === "boolean" || BOOLEAN_FIELDS.has(childField)) {
                appendStatusCheckbox(cell, value, childField);
            }
            else if (typeof value === "string" && /^https?:\/\//i.test(value)) {
                const link = document.createElement("a");
                link.href = value;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = value;
                cell.append(link);
            }
            else {
                cell.textContent = textValue(value);
            }

            row.append(cell);
        });
        body.append(row);
    });

    table.append(head, body);
    container.append(table);
}

function appendField(sectionBody, fieldName, value) {
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = fieldName;

    if (Array.isArray(value) && value.every(item => item && typeof item === "object" && item.fields)) {
        appendLinkedTable(description, fieldName, value);
    }
    else if (typeof value === "boolean" || ["Human presence", "Model card", "Robot deployment", "Dataset datasheet"].includes(fieldName)) {
        appendStatusCheckbox(description, value, fieldName);
    }
    else if (typeof value === "string" && /^https?:\/\//i.test(value)) {
        const link = document.createElement("a");
        link.href = value;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = value;
        description.append(link);
    }
    else if (value === undefined || value === null) {
        description.textContent = "";
    }
    else {
        description.textContent = textValue(value);
    }

    sectionBody.append(term, description);
}

function appendSectionFields(container, record, fieldNames) {
    const fields = fieldNames.filter(fieldName => hasCatalogueValue(record, fieldName));
    const standardTableField = fields.length === 1
        && ["Datasets", "Performance measures"].includes(fields[0]);

    if (standardTableField) {
        appendLinkedTable(container, fields[0], record.fields[fields[0]] || []);
        return;
    }

    if (fields.length > 0 && fields.every(fieldName => Object.hasOwn(EXPERIMENTAL_FIRST_COLUMN_NAMES, fieldName)
        || fieldName === "Augmentations")) {
        fields.forEach(fieldName =>
            appendLinkedTable(container, fieldName, record.fields[fieldName] || [])
        );
        return;
    }

    const body = document.createElement("dl");
    body.className = "catalogue-expanded-fields";
    fields.forEach(fieldName => appendField(body, fieldName, record.fields[fieldName]));
    container.append(body);
}

function hasCatalogueValue(record, fieldName) {
    const value = record.fields[fieldName];

    if (value === undefined || value === null || value === "") {
        return false;
    }

    return !Array.isArray(value) || value.length > 0;
}

function appendComparisonSectionCell(container, record, fieldNames, showMissing) {
    let body;

    fieldNames.forEach(fieldName => {
        const value = record.fields[fieldName];
        const isLinkedTable = Object.prototype.hasOwnProperty.call(EXPORT_LINKED_FIELD_ORDER, fieldName);

        if (isLinkedTable) {
            if (Array.isArray(value) && value.length > 0) {
                appendLinkedTable(container, fieldName, value);
            }
            else if (showMissing) {
                const missing = document.createElement("span");
                missing.className = "comparison-missing-value";
                missing.textContent = "-";
                container.append(missing);
            }
            return;
        }

        if (!body) {
            body = document.createElement("dl");
            body.className = "catalogue-expanded-fields";
            container.append(body);
        }

        if (hasCatalogueValue(record, fieldName)) {
            appendField(body, fieldName, value);
        }
        else if (showMissing) {
            const term = document.createElement("dt");
            const description = document.createElement("dd");
            term.textContent = fieldName;
            if (BOOLEAN_FIELDS.has(fieldName)) {
                appendStatusCheckbox(description, false, fieldName);
            }
            else {
                description.textContent = "-";
            }
            body.append(term, description);
        }
    });
}

function createExpandedSections(record) {
    const sections = document.createElement("div");
    sections.className = "catalogue-expanded-sections";

    CARD_SECTION_DEFINITIONS.forEach(([sectionName, fieldNames]) => {
        const fields = fieldNames.filter(fieldName => hasCatalogueValue(record, fieldName));

        if (fields.length === 0) {
            return;
        }

        const section = document.createElement("details");
        section.className = "catalogue-expanded-section";
        const summary = document.createElement("summary");
        summary.textContent = sectionName;
        section.append(summary);
        appendSectionFields(section, record, fields);
        sections.append(section);
    });

    return sections;
}

function renderRecords() {
    const records = filteredRecords();
    catalogueElements.results.replaceChildren();
    catalogueElements.status.textContent = `${records.length} of ${catalogueState.records.length} sheets`;
    catalogueElements.download.disabled = records.length === 0;
    catalogueElements.tableWrap.hidden = false;

    if (records.length === 0) {
        const emptyState = document.createElement("p");
        emptyState.className = "catalogue-empty";
        emptyState.textContent = "No affordance sheets match these filters.";
        catalogueElements.results.append(emptyState);
        return;
    }

    records.forEach(record => {
        const card = document.createElement("article");
        card.className = "catalogue-card";
        card.tabIndex = 0;
        card.setAttribute("aria-expanded", "false");

        const cardHeader = document.createElement("header");
        cardHeader.className = "catalogue-card-header";

        const modelName = document.createElement("h3");
        modelName.textContent = textValue(record.fields["Model name"]);

        const selectionLabel = document.createElement("label");
        selectionLabel.className = "catalogue-selection";
        selectionLabel.title = "Select for comparison";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = catalogueState.selectedIds.has(record.catalogueKey);
        checkbox.setAttribute("aria-label", `Compare ${record.fields["Model name"] || "sheet"}`);
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) catalogueState.selectedIds.add(record.catalogueKey);
            else catalogueState.selectedIds.delete(record.catalogueKey);
            updateComparisonBar();
        });
        selectionLabel.append(checkbox);

        const download = document.createElement("button");
        download.type = "button";
        download.className = "catalogue-download";
        download.setAttribute("aria-label", `Download ${record.fields["Model name"] || "affordance sheet"} as JSON`);
        download.title = "Download this affordance sheet as JSON";
        download.innerHTML = "<span aria-hidden=\"true\">↓</span>";
        download.addEventListener("click", () => downloadRecord(record));

        const cardControls = document.createElement("div");
        cardControls.className = "catalogue-card-controls";
        cardControls.append(selectionLabel, download);
        cardHeader.append(modelName, cardControls);

        const cardBody = document.createElement("dl");
        cardBody.className = "catalogue-card-fields";
        const cardFields = [
            ["Access date", container => container.textContent = textValue(record.fields["Access date"])],
            ["Affordance task", container => appendBadges(container, record.fields["Affordance task"] || [], "catalogue-badge catalogue-task-badge")],
            ["Modalities", container => appendBadges(container, record.fields.Modalities || [], "catalogue-badge catalogue-modality-badge")],
            ["Datasets", container => appendBadges(container, linkedNames(record, "Datasets"), "catalogue-badge catalogue-dataset-badge")],
            ["Human presence", container => appendStatusCheckbox(container, record.fields["Human presence"], "Human presence")],
            ["Robot deployment", container => appendStatusCheckbox(container, record.fields["Robot deployment"], "Robot deployment")]
        ];
        cardFields.forEach(([label, renderValue]) => {
            const term = document.createElement("dt");
            const description = document.createElement("dd");
            term.textContent = label;
            renderValue(description);
            cardBody.append(term, description);
        });

        const expandedSections = createExpandedSections(record);
        expandedSections.hidden = true;

        const cardSummary = document.createElement("div");
        cardSummary.className = "catalogue-card-summary";
        cardSummary.append(cardHeader, cardBody);

        const toggleCard = () => {
            renderSingleCard(record);
        };

        card.addEventListener("click", event => {
            if (event.target.closest("button, input, summary, a")) {
                return;
            }

            toggleCard();
        });
        card.addEventListener("keydown", event => {
            if ((event.key === "Enter" || event.key === " ") && event.target === card) {
                event.preventDefault();
                toggleCard();
            }
        });

        expandedSections.addEventListener("click", event => event.stopPropagation());
        card.append(cardSummary, expandedSections);
        catalogueElements.results.append(card);
    });
}

function openSheetDialog() {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty("--sheet-dialog-scrollbar", `${scrollbarWidth}px`);
    document.body.classList.add("sheet-dialog-open");
    catalogueElements.dialog.showModal();
}

function renderComparison() {
    const records = catalogueState.records.filter(record => catalogueState.selectedIds.has(record.catalogueKey));
    const showMissing = records.length > 1;
    const comparison = document.createElement("div");
    comparison.className = "comparison-aligned";
    comparison.style.setProperty("--comparison-columns", records.length);
    const modelHeadings = document.createElement("div");
    modelHeadings.className = "comparison-model-headings";
    records.forEach(record => {
        const heading = document.createElement("h3");
        heading.textContent = textValue(record.fields["Model name"]);
        modelHeadings.append(heading);
    });
    comparison.append(modelHeadings);

    CARD_SECTION_DEFINITIONS.forEach(([sectionName, fieldNames]) => {
        const visibleFields = fieldNames.filter(fieldName =>
            records.some(record => hasCatalogueValue(record, fieldName))
        );

        if (visibleFields.length === 0) {
            return;
        }

        const row = document.createElement("section");
        row.className = "comparison-section-row";
        if (sectionName === "⚙️ Experimental setup") {
            row.classList.add("comparison-experimental-setup");
        }
        const title = document.createElement("h4");
        title.textContent = sectionName;
        row.append(title);

        if (sectionName === "⚙️ Experimental setup") {
            visibleFields.forEach(fieldName => {
                const tableRow = document.createElement("div");
                tableRow.className = "comparison-setup-table-row";
                const tableCells = document.createElement("div");
                tableCells.className = "comparison-section-cells";

                records.forEach(record => {
                    const cell = document.createElement("div");
                    cell.className = "comparison-section-cell";
                    const value = record.fields[fieldName];

                    if (Array.isArray(value) && value.length > 0) {
                        appendLinkedTable(cell, fieldName, value);
                    }
                    else if (showMissing) {
                        const missing = document.createElement("span");
                        missing.className = "comparison-missing-value";
                        missing.textContent = "-";
                        cell.append(missing);
                    }

                    tableCells.append(cell);
                });

                tableRow.append(tableCells);
                row.append(tableRow);
            });

            comparison.append(row);
            return;
        }

        const cells = document.createElement("div");
        cells.className = "comparison-section-cells";
        records.forEach(record => {
            const cell = document.createElement("div");
            cell.className = "comparison-section-cell";
            appendComparisonSectionCell(cell, record, visibleFields, showMissing);
            cells.append(cell);
        });

        row.append(cells);
        comparison.append(row);
    });

    catalogueElements.comparisonContent.replaceChildren(comparison);
    openSheetDialog();
}

function renderSingleCard(record) {
    const card = document.createElement("article");
    card.className = "catalogue-card is-expanded comparison-card single-sheet-view";

    const heading = document.createElement("h3");
    heading.textContent = textValue(record.fields["Model name"]);
    const header = document.createElement("header");
    header.className = "catalogue-card-header";
    header.append(heading);

    const sections = createExpandedSections(record);
    sections.querySelectorAll("details").forEach(section => {
        section.open = true;
    });

    card.append(header, sections);
    catalogueElements.comparisonContent.replaceChildren(card);
    openSheetDialog();
}

async function loadCatalogue() {
    try {
        await loadExportFieldOrder();
        const response = await fetch(CATALOGUE_API_URL);
        const result = await response.json();
        if (!response.ok || !result.success) {
            if (response.status === 403) {
                throw new Error("This preview origin is not authorized by the catalogue service.");
            }

            if (response.status === 500) {
                if (Array.isArray(result.issues) && result.issues.length > 0) {
                    throw new Error(`${result.error}: ${result.issues.join("; ")}`);
                }

                throw new Error("The catalogue service is not configured or not available.");
            }

            throw new Error(result.error || "Catalogue request failed");
        }

        catalogueState.records = result.records.map((record, index) => ({
            ...record,
            catalogueKey: `sheet-${index}`
        }));
        catalogueElements.download.disabled = false;
        populateSelect(catalogueElements.task, uniqueFieldValues("Affordance task"));
        populateSelect(catalogueElements.modality, uniqueFieldValues("Modalities"));
        populateSelect(
            catalogueElements.dataset,
            [...new Set(result.records.flatMap(record => linkedNames(record, "Datasets")))].sort()
        );
        renderRecords();
    }
    catch (error) {
        catalogueElements.status.textContent = error.message;
        console.error(error);
    }
}

[catalogueElements.search, catalogueElements.task, catalogueElements.modality, catalogueElements.dataset]
    .forEach(control => control.addEventListener("input", renderRecords));

catalogueElements.clear.addEventListener("click", () => {
    catalogueElements.search.value = "";
    catalogueElements.task.value = "";
    catalogueElements.modality.value = "";
    catalogueElements.dataset.value = "";
    renderRecords();
});
catalogueElements.download.addEventListener("click", () => {
    const selectedRecords = catalogueState.records.filter(record =>
        catalogueState.selectedIds.has(record.catalogueKey)
    );
    downloadRecords(selectedRecords.length > 0 ? selectedRecords : filteredRecords());
});
catalogueElements.compare.addEventListener("click", renderComparison);
catalogueElements.closeComparison.addEventListener("click", () => catalogueElements.dialog.close());
catalogueElements.dialog.addEventListener("close", () => {
    document.body.classList.remove("sheet-dialog-open");
    document.documentElement.style.removeProperty("--sheet-dialog-scrollbar");
});

loadCatalogue();