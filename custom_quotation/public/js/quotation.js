// =======================================================
// ITEM CALCULATION LOGIC (UNCHANGED)
// =======================================================
frappe.ui.form.on("Quotation Item", {
    rate(frm, cdt, cdn) {
        calculate_custom_totals(frm, cdt, cdn);
    },
    custom_exchange_rate(frm, cdt, cdn) {
        calculate_custom_totals(frm, cdt, cdn);
    }
});

frappe.ui.form.on("Quotation", {
    custom_gross_weight(frm) {
        (frm.doc.items || []).forEach(item => {
            calculate_custom_totals(frm, "Quotation Item", item.name);
        });
        frm.refresh_field("items");
    },

    // Also recalc totals when the form is refreshed/loaded
    refresh(frm) {
        // calculate for existing dimension rows
        (frm.doc.custom_dimension_details || []).forEach(row => {
            calculate_dimension_row(frm, "Quotation Dimension Detail", row.name);
        });
        // ensure totals are up-to-date on load
        update_dimension_totals(frm);
    }
});

function calculate_custom_totals(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let gross_weight = frm.doc.custom_gross_weight || 0;
    let rate = row.rate || 0;
    let exchange_rate = row.custom_exchange_rate || 1;

    //row.custom_total = gross_weight * rate;
    row.custom_total_value = row.custom_total * exchange_rate;
    row.custom_total_in_inr = row.custom_total_value;

    frm.refresh_field("items");
}

// =======================================================
// DIMENSION TABLE LOGIC
// =======================================================

// Recalculate rows when mode changes
frappe.ui.form.on("Quotation", {
    custom_mode(frm) {
        (frm.doc.custom_dimension_details || []).forEach(row => {
            calculate_dimension_row(frm, "Quotation Dimension Detail", row.name);
        });
        frm.refresh_field("custom_dimension_details");
        // update totals after mode change
        update_dimension_totals(frm);
    }
});

// Recalc when any dimension field changes
frappe.ui.form.on("Quotation Dimension Detail", {
    number_of_boxes(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
    length_cm(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
    breadth_cm(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
    dim_height_cm(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
});

// Handle add & removal of rows (replace fieldname if different)
frappe.ui.form.on("Quotation Dimension Detail", {
    // fired when a new row is added to the table with fieldname custom_dimension_details
    custom_dimension_details_add(frm, cdt, cdn) {
        // small timeout ensures row is fully created before calculation
        setTimeout(() => {
            update_dimension_totals(frm);
        }, 50);
    },
    // fired when a row is removed
    custom_dimension_details_remove(frm, cdt, cdn) {
        setTimeout(() => {
            update_dimension_totals(frm);
        }, 100);
    }
});

function calculate_dimension_row(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (!row) return;

    let L = flt(row.length_cm || 0);
    let B = flt(row.breadth_cm || 0);
    let H = flt(row.dim_height_cm || 0);
    let boxes = flt(row.number_of_boxes || 1);

    // CBM (same for all modes)
    row.custom_cbm = (L * B * H / 1000000.0) * boxes;

    // Divisor based on mode
    let mode = (frm.doc.custom_mode || "").toUpperCase();
    let divisor = mode.startsWith("COURIER") ? 5000 : 6000;

    row.volume_weight = (L * B * H / divisor) * boxes;

    // Update parent totals (will sum CBM, boxes, weight, volume)
    update_dimension_totals(frm);

    frm.refresh_field("custom_dimension_details");
}

// =======================================================
// PARENT TOTALS (CBM, BOXES, WEIGHT, VOLUME WEIGHT)
// =======================================================
function update_dimension_totals(frm) {
    let total_cbm = 0;
    let total_weight = 0;
    let total_boxes = 0;
    let total_volume_weight = 0;

    (frm.doc.custom_dimension_details || []).forEach(row => {
        total_cbm += flt(row.custom_cbm || 0);
        total_weight += flt(row.weight_kg || 0);
        total_boxes += flt(row.number_of_boxes || 0);
        total_volume_weight += flt(row.volume_weight || 0);
    });

    // Update parent fields (exact fieldnames used here)
    frm.set_value("custom_total_no_of_boxes", total_boxes);           // total boxes (parent)
    frm.set_value("custom_totals_in_cbm", total_cbm);                // existing: total CBM
    frm.set_value("custom_total_cbm", total_cbm);                    // NEW mirror field
    frm.set_value("custom_gross_weight", total_weight);              // existing: total weight
    frm.set_value("custom_total_weight", total_weight);              // NEW mirror field
    frm.set_value("custom_total_volume_weight", total_volume_weight);// total volume weight

    // Trigger recalculation of item totals because gross weight changed
    frappe.ui.form.trigger("Quotation", "custom_gross_weight");
}


//VERSION 1.0

// // =======================================================
// // ITEM CALCULATION LOGIC (UNCHANGED)
// // =======================================================
// frappe.ui.form.on("Quotation Item", {
//     rate(frm, cdt, cdn) {
//         calculate_custom_totals(frm, cdt, cdn);
//     },
//     custom_exchange_rate(frm, cdt, cdn) {
//         calculate_custom_totals(frm, cdt, cdn);
//     }
// });

// frappe.ui.form.on("Quotation", {
//     custom_gross_weight(frm) {
//         (frm.doc.items || []).forEach(item => {
//             calculate_custom_totals(frm, "Quotation Item", item.name);
//         });
//         frm.refresh_field("items");
//     }
// });

// function calculate_custom_totals(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];
//     let gross_weight = frm.doc.custom_gross_weight || 0;
//     let rate = row.rate || 0;
//     let exchange_rate = row.custom_exchange_rate || 1;

//     row.custom_total = gross_weight * rate;
//     row.custom_total_value = row.custom_total * exchange_rate;
//     row.custom_total_in_inr = row.custom_total_value;

//     frm.refresh_field("items");
// }

// // =======================================================
// // DIMENSION TABLE LOGIC
// // =======================================================

// // Recalculate rows when mode changes
// frappe.ui.form.on("Quotation", {
//     custom_mode(frm) {
//         (frm.doc.custom_dimension_details || []).forEach(row => {
//             calculate_dimension_row(frm, "Quotation Dimension Detail", row.name);
//         });
//         frm.refresh_field("custom_dimension_details");
//     }
// });

// // Recalc when any dimension field changes
// frappe.ui.form.on("Quotation Dimension Detail", {
//     number_of_boxes(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
//     length_cm(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
//     breadth_cm(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
//     dim_height_cm(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
// });

// // Handle deletion of rows
// frappe.ui.form.on("Quotation Dimension Detail", {
//     custom_dimension_details_remove(frm, cdt, cdn) {
//         setTimeout(() => update_dimension_totals(frm), 200);
//     }
// });

// function calculate_dimension_row(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];

//     let L = flt(row.length_cm || 0);
//     let B = flt(row.breadth_cm || 0);
//     let H = flt(row.dim_height_cm || 0);
//     let boxes = flt(row.number_of_boxes || 1);

//     // CBM
//     row.custom_cbm = (L * B * H / 1000000.0) * boxes;

//     // Divisor based on mode
//     let mode = (frm.doc.custom_mode || "").toUpperCase();
//     let divisor = mode.startsWith("COURIER") ? 5000 : 6000;

//     row.volume_weight = (L * B * H / divisor) * boxes;

//     // Update parent totals
//     update_dimension_totals(frm);

//     frm.refresh_field("custom_dimension_details");
// }

// // =======================================================
// // PARENT TOTALS (CBM + GROSS WEIGHT)
// // =======================================================
// function update_dimension_totals(frm) {
//     let total_cbm = 0;
//     let total_weight = 0;

//     (frm.doc.custom_dimension_details || []).forEach(row => {
//         total_cbm += flt(row.custom_cbm || 0);
//         total_weight += flt(row.weight_kg || 0);
//     });

//     // Update parent fields
//     frm.set_value("custom_totals_in_cbm", total_cbm);
//     frm.set_value("custom_gross_weight", total_weight);

//     // Trigger recalculation of item totals
//     frappe.ui.form.trigger("Quotation", "custom_gross_weight");
// }
