-- Adds the "Order title" field required by Quick Entry
-- (docs/product_requirements.md §7.3/§8: "Quick Entry should allow an order to be saved
-- with only: Customer, Order title, Order type, Current status, Total amount, Due date,
-- Notes"). Missed in the initial docs/data_model.md pass — orders had no free-text label
-- independent of its line items. Nullable at the database level (detailed-entry drafts
-- can exist before a title is chosen); required by the application-layer validation for
-- both entry modes, matching how every other "required in the UI, nullable in the
-- schema" field in this codebase is handled.

alter table orders add column title text;
