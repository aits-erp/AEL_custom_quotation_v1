import frappe
from frappe.model.document import Document
from frappe.utils import flt

class Quotation(Document):

    def validate(self):
        # 1. Dimension rows
        self.update_dimension_rows()

        # 2. Parent dimension totals
        self.update_dimension_totals()

        # 3. Item calculations (formula OR manual)
        self.update_custom_item_totals()

        # 4. Parent INR total
        self.update_custom_total_parent()

    # -----------------------------------------------------------
    # ITEM TOTAL CALCULATIONS (FORMULA + MANUAL SAFE)
    # -----------------------------------------------------------
    def update_custom_item_totals(self):
        mode = (self.custom_mode or "").upper()

        for item in self.items:
            rate = flt(item.rate or 0)
            exchange_rate = flt(item.custom_exchange_rate or 1)

            # ---------- FORMULA PATH ----------
            if item.custom_formula:
                calculated = None

                if mode in ("SEA - LCL IMPORT", "SEA - LCL EXPORT"):
                    calculated = flt(self.custom_total_cbm) * rate

                elif mode in ("AIR - IMPORT", "AIR - EXPORT"):
                    chargeable_weight = max(
                        flt(self.custom_total_weight),
                        flt(self.custom_total_volume_weight)
                    )
                    calculated = chargeable_weight * rate

                else:
                    frappe.msgprint(
                        f"No auto formula defined for mode '{self.custom_mode}'. "
                        "Please enter Custom Total manually.",
                        alert=True
                    )

                if calculated is not None:
                    item.custom_total = calculated

            # ---------- INR CALCULATION (ALWAYS) ----------
            item.custom_total_value = flt(item.custom_total or 0) * exchange_rate
            item.custom_total_in_inr = item.custom_total_value

    # -----------------------------------------------------------
    # DIMENSION ROW CALCULATION
    # -----------------------------------------------------------
    def update_dimension_rows(self):
        mode = (self.custom_mode or "").upper()

        for row in (self.custom_dimension_details or []):
            L = flt(row.length_cm or 0)
            B = flt(row.breadth_cm or 0)
            H = flt(row.dim_height_cm or 0)
            boxes = flt(row.number_of_boxes or 1)

            row.custom_cbm = (L * B * H / 1000000.0) * boxes

            divisor = 5000.0 if mode.startswith("COURIER") else 6000.0
            row.volume_weight = (L * B * H / divisor) * boxes

    # -----------------------------------------------------------
    # PARENT DIMENSION TOTALS
    # -----------------------------------------------------------
    def update_dimension_totals(self):
        total_cbm = 0.0
        total_weight = 0.0
        total_volume_weight = 0.0
        total_boxes = 0.0

        for row in (self.custom_dimension_details or []):
            total_cbm += flt(row.custom_cbm or 0)
            total_weight += flt(row.weight_kg or 0)
            total_volume_weight += flt(row.volume_weight or 0)
            total_boxes += flt(row.number_of_boxes or 0)

        total_cbm = flt(total_cbm, 2)

        self.custom_totals_in_cbm = total_cbm
        self.custom_gross_weight = total_weight

        self.custom_total_cbm = total_cbm
        self.custom_total_weight = total_weight
        self.custom_total_volume_weight = total_volume_weight
        self.custom_total_no_of_boxes = total_boxes

    # -----------------------------------------------------------
    # PARENT INR TOTAL
    # -----------------------------------------------------------
    def update_custom_total_parent(self):
        self.custom_total_inr = sum(
            flt(item.custom_total_in_inr or 0)
            for item in self.items
        )



# import frappe
# from frappe.model.document import Document
# from frappe.utils import flt

# class Quotation(Document):
            
#     def validate(self):
#         # Item totals
#         self.update_custom_item_totals()

#         # Dimension row calculations
#         self.update_dimension_rows()

#         # Parent totals
#         self.update_dimension_totals()

#         self.update_custom_total_parent()

#     # -----------------------------------------------------------
#     # ITEM TOTAL CALCULATIONS (UNCHANGED)
#     # -----------------------------------------------------------
#     def update_custom_item_totals(self):
#         gross_weight = self.custom_gross_weight or 0

#         for item in self.items:
#             rate = item.rate or 0
#             exchange_rate = item.custom_exchange_rate or 1

#             item.custom_total = gross_weight * rate
#             item.custom_total_value = item.custom_total * exchange_rate
#             item.custom_total_in_inr = item.custom_total_value

#     # -----------------------------------------------------------
#     # DIMENSION ROW CALCULATION
#     # -----------------------------------------------------------
#     def update_dimension_rows(self):
#         mode = (self.custom_mode or "").upper()

#         for row in (self.custom_dimension_details or []):
#             L = row.length_cm or 0
#             B = row.breadth_cm or 0
#             H = row.dim_height_cm or 0
#             boxes = row.number_of_boxes or 1

#             # CBM
#             row.custom_cbm = (L * B * H / 1000000.0) * boxes

#             # Volume weight
#             if mode.startswith("COURIER"):
#                 divisor = 5000.0
#             else:
#                 divisor = 6000.0

#             row.volume_weight = (L * B * H / divisor) * boxes

#     # -----------------------------------------------------------
#     # PARENT TOTALS (CBM + GROSS WEIGHT)
#     # -----------------------------------------------------------
#     def update_dimension_totals(self):
#         total_cbm = 0.0
#         total_weight = 0.0

#         for row in (self.custom_dimension_details or []):
#             total_cbm += (row.custom_cbm or 0)
#             total_weight += (row.weight_kg or 0)

#         # Round total_cbm to 2 decimals to avoid floating artefacts
#         total_cbm = flt(total_cbm, 2)
        
#         # Existing parent fields
#         self.custom_totals_in_cbm = total_cbm
#         self.custom_gross_weight = total_weight

#         # Newly requested mirror fields
#         self.custom_total_cbm = total_cbm
#         self.custom_total_weight = total_weight

#         # Already existing total fields
#         self.custom_total_no_of_boxes = sum((row.number_of_boxes or 0) for row in (self.custom_dimension_details or []))
#         self.custom_total_volume_weight = sum((row.volume_weight or 0) for row in (self.custom_dimension_details or []))


#     def update_custom_total_parent(self):
#         """
#         Calculate parent-level custom_total as
#         sum of item.custom_total_in_inr
#         """
#         total = 0.0

#         for item in self.items:
#             total += flt(item.custom_total_in_inr or 0)

#         self.custom_total_inr = total
