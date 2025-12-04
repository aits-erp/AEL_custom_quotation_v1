import frappe
from frappe.model.document import Document

class Quotation(Document):

    def validate(self):
        # Item totals
        self.update_custom_item_totals()

        # Dimension row calculations
        self.update_dimension_rows()

        # Parent totals
        self.update_dimension_totals()

    # -----------------------------------------------------------
    # ITEM TOTAL CALCULATIONS (UNCHANGED)
    # -----------------------------------------------------------
    def update_custom_item_totals(self):
        gross_weight = self.custom_gross_weight or 0

        for item in self.items:
            rate = item.rate or 0
            exchange_rate = item.custom_exchange_rate or 1

            item.custom_total = gross_weight * rate
            item.custom_total_value = item.custom_total * exchange_rate
            item.custom_total_in_inr = item.custom_total_value

    # -----------------------------------------------------------
    # DIMENSION ROW CALCULATION
    # -----------------------------------------------------------
    def update_dimension_rows(self):
        mode = (self.custom_mode or "").upper()

        for row in (self.custom_dimension_details or []):
            L = row.length_cm or 0
            B = row.breadth_cm or 0
            H = row.dim_height_cm or 0
            boxes = row.number_of_boxes or 1

            # CBM
            row.custom_cbm = (L * B * H / 1000000.0) * boxes

            # Volume weight
            if mode.startswith("COURIER"):
                divisor = 5000.0
            else:
                divisor = 6000.0

            row.volume_weight = (L * B * H / divisor) * boxes

    # -----------------------------------------------------------
    # PARENT TOTALS (CBM + GROSS WEIGHT)
    # -----------------------------------------------------------
    def update_dimension_totals(self):
        total_cbm = 0.0
        total_weight = 0.0

        for row in (self.custom_dimension_details or []):
            total_cbm += (row.custom_cbm or 0)
            total_weight += (row.weight_kg or 0)

        self.custom_totals_in_cbm = total_cbm
        self.custom_gross_weight = total_weight
