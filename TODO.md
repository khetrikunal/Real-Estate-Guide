# TODO

## Phase 2: Complete Add Project UX Redesign (Taxonomy-driven wizard)

- [ ] Create reusable wizard components under `REACT/src/v0/components/property/add-project-wizard/`
  - [ ] Stepper + navigation controls
  - [ ] Taxonomy cards (Property Category + Property Type + subcategory mapping)
  - [ ] Basic info step
  - [ ] Location step (address + state/city/area/pincode + map picker)
  - [ ] Dynamic configuration step (rows based on selected type; allow unlimited rows)
  - [ ] Pricing step (amount+unit input + auto-generated price range for multi-config)
  - [ ] Amenities multi-select
  - [ ] Media step (drag-drop cover + gallery + floorplans + brochure + video)
  - [ ] Review step (auto-generated summary; remove manual Property Summary inputs)
- [ ] Refactor `REACT/src/v0/app/[role]/properties/new/page.tsx` to use the wizard components
- [ ] Ensure payload mapping remains compatible with existing backend fields (`projectCategory`, `propertySubcategory`, `configs[]`, etc.)
- [ ] Add/keep validations: builder number (10 digits), pincode (6 digits), required project name + address, require at least one image before publish/save
- [ ] Verify compile + run basic TypeScript checks

