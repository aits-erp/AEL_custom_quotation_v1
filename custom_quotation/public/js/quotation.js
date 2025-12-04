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
    }
});

function calculate_custom_totals(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let gross_weight = frm.doc.custom_gross_weight || 0;
    let rate = row.rate || 0;
    let exchange_rate = row.custom_exchange_rate || 1;

    row.custom_total = gross_weight * rate;
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
    }
});

// Recalc when any dimension field changes
frappe.ui.form.on("Quotation Dimension Detail", {
    number_of_boxes(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
    length_cm(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
    breadth_cm(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
    dim_height_cm(frm, cdt, cdn) { calculate_dimension_row(frm, cdt, cdn); },
});

// Handle deletion of rows
frappe.ui.form.on("Quotation Dimension Detail", {
    custom_dimension_details_remove(frm, cdt, cdn) {
        setTimeout(() => update_dimension_totals(frm), 200);
    }
});

function calculate_dimension_row(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    let L = flt(row.length_cm || 0);
    let B = flt(row.breadth_cm || 0);
    let H = flt(row.dim_height_cm || 0);
    let boxes = flt(row.number_of_boxes || 1);

    // CBM
    row.custom_cbm = (L * B * H / 1000000.0) * boxes;

    // Divisor based on mode
    let mode = (frm.doc.custom_mode || "").toUpperCase();
    let divisor = mode.startsWith("COURIER") ? 5000 : 6000;

    row.volume_weight = (L * B * H / divisor) * boxes;

    // Update parent totals
    update_dimension_totals(frm);

    frm.refresh_field("custom_dimension_details");
}

// =======================================================
// PARENT TOTALS (CBM + GROSS WEIGHT)
// =======================================================
function update_dimension_totals(frm) {
    let total_cbm = 0;
    let total_weight = 0;

    (frm.doc.custom_dimension_details || []).forEach(row => {
        total_cbm += flt(row.custom_cbm || 0);
        total_weight += flt(row.weight_kg || 0);
    });

    // Update parent fields
    frm.set_value("custom_totals_in_cbm", total_cbm);
    frm.set_value("custom_gross_weight", total_weight);

    // Trigger recalculation of item totals
    frappe.ui.form.trigger("Quotation", "custom_gross_weight");
}
