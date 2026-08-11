import { ValidationError, ConflictError, NotFoundError } from '../../utils/errors.js';
import { mapAllergy, mapDrugInteraction, mapMedicine } from '../../utils/serializers.js';
import * as safetyRepository from './safety.repository.js';

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function unique(values) {
  return [...new Set(values)];
}

function severityRank(severity) {
  const ranks = {
    CONTRAINDICATED: 4,
    SEVERE: 3,
    MODERATE: 2,
    MILD: 1,
    LOW: 1,
  };
  return ranks[severity] || 0;
}

function riskLevelFromEntries(entries) {
  const highest = entries.reduce((max, entry) => Math.max(max, severityRank(entry.severity || entry.allergenSeverity || entry.riskLevel)), 0);
  if (highest >= 4) return 'HIGH';
  if (highest >= 3) return 'HIGH';
  if (highest >= 2) return 'MODERATE';
  if (highest >= 1) return 'LOW';
  return 'NONE';
}

function medicineMatchesAllergen(medicine, allergen) {
  if (!medicine || !allergen) return false;
  const needle = allergen.toLowerCase();
  const haystacks = [
    medicine.name,
    medicine.generic_name,
    medicine.brand_name,
    medicine.description,
    medicine.contraindications,
    medicine.side_effects,
    medicine.symptoms,
    ...(medicine.tags || []),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return haystacks.some((value) => value.includes(needle) || needle.includes(value));
}

export async function checkDrugInteractions(input) {
  const medicineIds = unique(
    normalizeList(input.medicineIds || input.medicineIdsCsv || input.medicine_ids).filter(isUuidLike)
  );
  const manualAllergies = unique([
    ...normalizeList(input.allergies || input.allergiesCsv),
    ...normalizeList(input.allergen),
  ]);
  const patientPhone = input.patientPhone || input.patient_phone || null;

  if (medicineIds.length === 0) {
    throw new ValidationError('At least one medicine is required for interaction checks', [
      { field: 'medicineIds', message: 'At least one medicine is required', code: 'too_small' },
    ]);
  }

  const selectedMedicines = await safetyRepository.findMedicinesByIds(medicineIds);
  if (selectedMedicines.length === 0) {
    throw new ValidationError('No medicines were found for the provided identifiers', [
      { field: 'medicineIds', message: 'No medicines matched the provided identifiers', code: 'not_found' },
    ]);
  }
  const selectedMap = new Map(selectedMedicines.map((medicine) => [medicine.id, medicine]));
  const skippedMedicineIds = medicineIds.filter((id) => !selectedMap.has(id));
  const interactions = selectedMedicines.length > 1
    ? await safetyRepository.findInteractions(Array.from(selectedMap.keys()))
    : [];
  const patientAllergies = patientPhone
    ? await safetyRepository.findPatientAllergies(patientPhone)
    : [];

  const mappedMedicines = selectedMedicines.map((medicine) => mapMedicine(medicine));
  const mappedInteractions = interactions.map((interaction) => mapDrugInteraction(interaction));
  const mappedPatientAllergies = patientAllergies.map((allergy) => mapAllergy(allergy));

  const allergyWarnings = [];

  for (const allergy of [...mappedPatientAllergies, ...manualAllergies.map((allergen) => ({ allergen, severity: 'UNKNOWN' }))]) {
    const allergen = allergy.allergen || allergy.allergenName || allergy;
    for (const medicine of mappedMedicines) {
      if (medicineMatchesAllergen(medicine, allergen)) {
        const severity = allergy.severity && allergy.severity !== 'UNKNOWN'
          ? allergy.severity
          : 'MODERATE';
        allergyWarnings.push({
          type: 'ALLERGY',
          severity,
          allergen,
          medicineId: medicine.id,
          medicineName: medicine.name,
          message: `${medicine.name} may trigger the reported allergy to ${allergen}`,
        });
      }
    }
  }

  const interactionWarnings = mappedInteractions.map((interaction) => ({
    type: 'INTERACTION',
    severity: interaction.severity,
    medicineAId: interaction.medicineAId,
    medicineBId: interaction.medicineBId,
    medicineAName: interaction.medicineAName,
    medicineBName: interaction.medicineBName,
    message: interaction.description,
    recommendation: interaction.recommendation,
  }));

  const riskLevel = riskLevelFromEntries([...allergyWarnings, ...interactionWarnings]);

  return {
    selectedMedicines: mappedMedicines,
    skippedMedicineIds,
    patientAllergies: mappedPatientAllergies,
    manualAllergies,
    interactions: mappedInteractions,
    warnings: [...interactionWarnings, ...allergyWarnings],
    riskLevel,
    safe: riskLevel === 'NONE' || riskLevel === 'LOW',
  };
}

const VALID_SEVERITIES = ['MILD', 'MODERATE', 'SEVERE', 'CONTRAINDICATED'];

export async function listInteractions(queryParams) {
  const limit = Math.min(200, Math.max(1, parseInt(queryParams.limit, 10) || 50));
  const offset = Math.max(0, parseInt(queryParams.offset, 10) || 0);
  const result = await safetyRepository.listInteractions({
    limit,
    offset,
    medicineId: queryParams.medicineId || null,
    severity: queryParams.severity || null,
  });

  return {
    data: result.rows.map((row) => ({
      ...mapDrugInteraction(row),
      medicineAGeneric: row.medicine_a_generic || null,
      medicineBGeneric: row.medicine_b_generic || null,
    })),
    meta: {
      total: result.total,
      limit,
      offset,
      totalPages: Math.max(1, Math.ceil(result.total / limit)),
    },
  };
}

export async function createInteraction(data) {
  if (!data.medicineAId || !data.medicineBId) {
    throw new ValidationError('Both medicines are required to register an interaction', [
      { field: 'medicineAId', message: 'Medicine A is required', code: 'invalid_type' },
      { field: 'medicineBId', message: 'Medicine B is required', code: 'invalid_type' },
    ]);
  }
  if (data.medicineAId === data.medicineBId) {
    throw new ValidationError('A medicine cannot interact with itself', [
      { field: 'medicineBId', message: 'Choose a different medicine for B', code: 'same_value' },
    ]);
  }
  if (!VALID_SEVERITIES.includes(data.severity)) {
    throw new ValidationError(`Severity must be one of: ${VALID_SEVERITIES.join(', ')}`, [
      { field: 'severity', message: 'Invalid severity value', code: 'invalid_enum' },
    ]);
  }
  if (!data.description || !String(data.description).trim()) {
    throw new ValidationError('A description of the interaction is required', [
      { field: 'description', message: 'Description is required', code: 'invalid_type' },
    ]);
  }

  const selected = await safetyRepository.findMedicinesByIds([data.medicineAId, data.medicineBId]);
  if (selected.length !== 2) {
    throw new ValidationError('One or both selected medicines were not found');
  }

  const existing = await safetyRepository.findInteractionByPair(data.medicineAId, data.medicineBId);
  if (existing) {
    throw new ConflictError('An interaction between these two medicines is already registered');
  }

  const interaction = await safetyRepository.createInteraction(data);
  return mapDrugInteraction(interaction);
}

export async function deleteInteraction(id) {
  const interaction = await safetyRepository.findInteractionById(id);
  if (!interaction) throw new NotFoundError('Drug interaction', id);
  const deleted = await safetyRepository.deleteInteraction(id);
  return mapDrugInteraction(deleted);
}
