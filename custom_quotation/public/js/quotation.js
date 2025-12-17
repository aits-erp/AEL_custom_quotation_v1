// =======================================================
// ITEM LOGIC – FORMULA + MANUAL SAFE
// =======================================================

frappe.ui.form.on("Quotation Item", {
    items_add(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        row.custom_formula = 0; // always clean row
        frm.refresh_field("items");
    },

    custom_formula(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        toggle_custom_total_edit(frm, row);
        recalc_item_row(frm, row);
        update_custom_total_parent(frm);
    },

    rate(frm, cdt, cdn) {
        recalc_item_row(frm, locals[cdt][cdn]);
    },

    custom_exchange_rate(frm, cdt, cdn) {
        recalc_item_row(frm, locals[cdt][cdn]);
    },

    custom_total(frm, cdt, cdn) {
        // MANUAL PATH
        let row = locals[cdt][cdn];
        if (!row.custom_formula) {
            recalc_manual_row(frm, row);
        }
    }
});

function toggle_custom_total_edit(frm, row) {
    frm.fields_dict.items.grid.toggle_enable(
        "custom_total",
        !row.custom_formula
    );
}

function recalc_item_row(frm, row) {
    if (!row) return;

    let mode = (frm.doc.custom_mode || "").toUpperCase();
    let rate = flt(row.rate || 0);
    let exchange_rate = flt(row.custom_exchange_rate || 1);

    if (row.custom_formula) {
        let value = null;

        if (["SEA - LCL IMPORT", "SEA - LCL EXPORT"].includes(mode)) {
            value = flt(frm.doc.custom_total_cbm || 0) * rate;
        }
        else if (["AIR - IMPORT", "AIR - EXPORT"].includes(mode)) {
            let wt = Math.max(
                flt(frm.doc.custom_total_weight || 0),
                flt(frm.doc.custom_total_volume_weight || 0)
            );
            value = wt * rate;
        }

        if (value !== null) {
            row.custom_total = value;
        }
    }

    // ALWAYS update INR
    row.custom_total_value = flt(row.custom_total || 0) * exchange_rate;
    row.custom_total_in_inr = row.custom_total_value;

    frm.refresh_field("items");
}

function recalc_manual_row(frm, row) {
    let exchange_rate = flt(row.custom_exchange_rate || 1);

    row.custom_total_value = flt(row.custom_total || 0) * exchange_rate;
    row.custom_total_in_inr = row.custom_total_value;

    frm.refresh_field("items");
    update_custom_total_parent(frm);
}

// =======================================================
// DIMENSION LOGIC (UNCHANGED)
// =======================================================

frappe.ui.form.on("Quotation", {
    custom_mode(frm) {
        (frm.doc.custom_dimension_details || []).forEach(r => {
            calculate_dimension_row(frm, r);
        });
        update_dimension_totals(frm);
    }
});

frappe.ui.form.on("Quotation Dimension Detail", {
    number_of_boxes(frm, cdt, cdn) { calculate_dimension_row(frm, locals[cdt][cdn]); },
    length_cm(frm, cdt, cdn) { calculate_dimension_row(frm, locals[cdt][cdn]); },
    breadth_cm(frm, cdt, cdn) { calculate_dimension_row(frm, locals[cdt][cdn]); },
    dim_height_cm(frm, cdt, cdn) { calculate_dimension_row(frm, locals[cdt][cdn]); },
    weight_kg(frm) { update_dimension_totals(frm); }
});

function calculate_dimension_row(frm, row) {
    let L = flt(row.length_cm || 0);
    let B = flt(row.breadth_cm || 0);
    let H = flt(row.dim_height_cm || 0);
    let boxes = flt(row.number_of_boxes || 1);

    row.custom_cbm = (L * B * H / 1000000.0) * boxes;

    let divisor = (frm.doc.custom_mode || "").toUpperCase().startsWith("COURIER")
        ? 5000
        : 6000;

    row.volume_weight = (L * B * H / divisor) * boxes;

    update_dimension_totals(frm);
    frm.refresh_field("custom_dimension_details");
}

function update_dimension_totals(frm) {
    let total_cbm = 0,
        total_weight = 0,
        total_boxes = 0,
        total_volume_weight = 0;

    (frm.doc.custom_dimension_details || []).forEach(row => {
        total_cbm += flt(row.custom_cbm || 0);
        total_weight += flt(row.weight_kg || 0);
        total_boxes += flt(row.number_of_boxes || 0);
        total_volume_weight += flt(row.volume_weight || 0);
    });

    total_cbm = flt(total_cbm, 2);

    frm.set_value("custom_total_no_of_boxes", total_boxes);
    frm.set_value("custom_totals_in_cbm", total_cbm);
    frm.set_value("custom_total_cbm", total_cbm);
    frm.set_value("custom_gross_weight", total_weight);
    frm.set_value("custom_total_weight", total_weight);
    frm.set_value("custom_total_volume_weight", total_volume_weight);
}

// =======================================================
// PARENT TOTAL
// =======================================================

function update_custom_total_parent(frm) {
    let total = 0;
    (frm.doc.items || []).forEach(item => {
        total += flt(item.custom_total_in_inr || 0);
    });
    frm.set_value("custom_total_inr", total);
}




// frappe.ui.form.on("Quotation Item", {
//     rate(frm, cdt, cdn) {
//         calculate_custom_totals(frm, cdt, cdn);
//     },
//     custom_exchange_rate(frm, cdt, cdn) {
//         calculate_custom_totals(frm, cdt, cdn);
//     },
//     items_add(frm, cdt, cdn) {
//         calculate_custom_totals(frm, cdt, cdn);
//     }
// });

// frappe.ui.form.on("Quotation", {
//     custom_gross_weight(frm) {
//         if (frm.is_saving) return; // 🔒 critical guard

//         (frm.doc.items || []).forEach(item => {
//             if (item && item.name) {
//                 calculate_custom_totals(frm, "Quotation Item", item.name);
//             }
//         });
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

//     // frm.refresh_field("items");
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
//         // update totals after mode change
//         update_dimension_totals(frm);
//     }
// });

// // Recalc when any dimension field changes
// frappe.ui.form.on("Quotation Dimension Detail", {
//     number_of_boxes(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
//     length_cm(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
//     breadth_cm(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
//     dim_height_cm(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
// });

// // Handle add & removal of rows (replace fieldname if different)
// frappe.ui.form.on("Quotation Dimension Detail", {
//     // fired when a new row is added to the table with fieldname custom_dimension_details
//     custom_dimension_details_add(frm, cdt, cdn) {
//         // small timeout ensures row is fully created before calculation
//         setTimeout(() => {
//             update_dimension_totals(frm);
//         }, 50);
//     },
//     // fired when a row is removed
//     custom_dimension_details_remove(frm, cdt, cdn) {
//         setTimeout(() => {
//             update_dimension_totals(frm);
//         }, 100);
//     }
// });

// function calculate_dimension_row(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];
//     if (!row) return;

//     let L = flt(row.length_cm || 0);
//     let B = flt(row.breadth_cm || 0);
//     let H = flt(row.dim_height_cm || 0);
//     let boxes = flt(row.number_of_boxes || 1);

//     // CBM (same for all modes)
//     row.custom_cbm = (L * B * H / 1000000.0) * boxes;

//     // Divisor based on mode
//     let mode = (frm.doc.custom_mode || "").toUpperCase();
//     let divisor = mode.startsWith("COURIER") ? 5000 : 6000;

//     row.volume_weight = (L * B * H / divisor) * boxes;

//     // Update parent totals (will sum CBM, boxes, weight, volume)
//     update_dimension_totals(frm);

//     frm.refresh_field("custom_dimension_details");
// }

// // =======================================================
// // PARENT TOTALS (CBM, BOXES, WEIGHT, VOLUME WEIGHT)
// // =======================================================
// function update_dimension_totals(frm) {
//     let total_cbm = 0;
//     let total_weight = 0;
//     let total_boxes = 0;
//     let total_volume_weight = 0;

//     (frm.doc.custom_dimension_details || []).forEach(row => {
//         total_cbm += flt(row.custom_cbm || 0);
//         total_weight += flt(row.weight_kg || 0);
//         total_boxes += flt(row.number_of_boxes || 0);
//         total_volume_weight += flt(row.volume_weight || 0);
//     });

//     // Round to 2 decimals to avoid 1.0000000002 issues
//     total_cbm = flt(total_cbm, 2);

//     // Update parent fields (exact fieldnames used here)
//     frm.set_value("custom_total_no_of_boxes", total_boxes);           // total boxes (parent)
//     frm.set_value("custom_totals_in_cbm", total_cbm);                // existing: total CBM
//     frm.set_value("custom_total_cbm", total_cbm);                    // NEW mirror field
//     frm.set_value("custom_gross_weight", total_weight);              // existing: total weight
//     frm.set_value("custom_total_weight", total_weight);              // NEW mirror field
//     frm.set_value("custom_total_volume_weight", total_volume_weight);// total volume weight

// }

// // ================================
// // CUSTOM PARENT TOTAL (UI ONLY)
// // ================================

// frappe.ui.form.on("Quotation", {
//     refresh(frm) {
//         update_custom_total_parent(frm);
//     }
// });

// frappe.ui.form.on("Quotation Item", {
//     custom_total_in_inr(frm) {
//         update_custom_total_parent(frm);
//     },
//     rate(frm) {
//         update_custom_total_parent(frm);
//     },
//     custom_exchange_rate(frm) {
//         update_custom_total_parent(frm);
//     },
//     items_add(frm) {
//         update_custom_total_parent(frm);
//     },
//     items_remove(frm) {
//         update_custom_total_parent(frm);
//     }
// });

// function update_custom_total_parent(frm) {
//     let total = 0;

//     (frm.doc.items || []).forEach(item => {
//         total += flt(item.custom_total_in_inr || 0);
//     });

//     // update ONLY your custom field
//     frm.set_value("custom_total_inr", total);
// }
