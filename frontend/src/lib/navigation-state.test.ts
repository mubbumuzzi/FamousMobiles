import test from "node:test";
import assert from "node:assert/strict";

type DeviceType = "MOBILE" | "TABLET" | "SMARTWATCH" | "OTHER";

interface IntakeDraftState {
  step: number;
  selectedStoreId: string;
  customerId: string;
  mobile: string;
  deviceType: DeviceType;
  brand: string;
  model: string;
  color: string;
  imei: string;
  accessories: string[];
  conditions: string[];
  problem: string;
  selectedTemplates: string[];
  estimatedCost: string;
  quoteAfterDiagnosis: boolean;
  advancePaid: string;
  edd: string;
  warrantyDays: number;
}

const initialDraftState: IntakeDraftState = {
  step: 0,
  selectedStoreId: "",
  customerId: "",
  mobile: "",
  deviceType: "MOBILE",
  brand: "",
  model: "",
  color: "",
  imei: "",
  accessories: [],
  conditions: [],
  problem: "",
  selectedTemplates: [],
  estimatedCost: "",
  quoteAfterDiagnosis: false,
  advancePaid: "",
  edd: "",
  warrantyDays: 0,
};

test("IntakeDraft initial state structure", () => {
  assert.equal(initialDraftState.step, 0);
  assert.equal(initialDraftState.deviceType, "MOBILE");
  assert.equal(initialDraftState.brand, "");
  assert.equal(initialDraftState.model, "");
  assert.equal(initialDraftState.problem, "");
  assert.deepEqual(initialDraftState.accessories, []);
  assert.deepEqual(initialDraftState.conditions, []);
  assert.deepEqual(initialDraftState.selectedTemplates, []);
  assert.equal(initialDraftState.estimatedCost, "");
  assert.equal(initialDraftState.advancePaid, "");
});

test("IntakeDraft serialization and deserialization", () => {
  const customDraft: IntakeDraftState = {
    ...initialDraftState,
    step: 2,
    brand: "Apple",
    model: "iPhone 15 Pro",
    problem: "Back glass cracked",
    estimatedCost: "4500",
  };

  const serialized = JSON.stringify(customDraft);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.step, 2);
  assert.equal(parsed.brand, "Apple");
  assert.equal(parsed.model, "iPhone 15 Pro");
  assert.equal(parsed.problem, "Back glass cracked");
  assert.equal(parsed.estimatedCost, "4500");
});
