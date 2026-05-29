from __future__ import annotations

from flask import Blueprint
from flask import jsonify

from core.validation import JsonField
from core.validation import JsonSchema


class PatientController:
    def __init__(self, patient_service, *, json_ready, json_error):
        self._patient_service = patient_service
        self._json_ready = json_ready
        self._json_error = json_error

    def list_patients(self, org_id: str):
        patients = self._patient_service.list_patients(org_id)
        return jsonify(self._json_ready(patients))

    def get_patient(self, org_id: str, patient_id: str):
        patient = self._patient_service.get_patient(org_id, patient_id)
        if patient is None:
            return self._json_error(404, "PATIENT_NOT_FOUND", "patient not found")
        return jsonify(self._json_ready(patient))

    def patient_exists(self, org_id: str, patient_id: str) -> bool:
        return self._patient_service.patient_exists(org_id, patient_id)

    def create_patient(
        self,
        org_id: str,
        *,
        name: str,
        email: str,
        birth_date: str,
        treatment_start_date: str,
    ):
        patient = self._patient_service.create_patient(
            org_id,
            name=name,
            email=email,
            birth_date=birth_date,
            treatment_start_date=treatment_start_date,
        )
        return jsonify(self._json_ready(patient)), 201


def create_patient_blueprint(*, patient_controller: PatientController, deps):
    bp = Blueprint("patients", __name__)
    d = deps

    @bp.get("/api/patients")
    def list_patients():
        org_id = d.extract_org_id()
        return patient_controller.list_patients(org_id)

    @bp.get("/api/patients/<patient_id>")
    def get_patient(patient_id: str):
        org_id = d.extract_org_id()
        return patient_controller.get_patient(org_id, patient_id)

    @bp.post("/api/patients")
    def create_patient():
        org_id = d.extract_org_id()
        role = d.extract_role()
        d.require_write_role(role)
        payload = d.validate_json_schema(
            JsonSchema(
                fields={
                    "name": JsonField(required=True),
                    "email": JsonField(required=True),
                    "birthDate": JsonField(required=True),
                    "treatmentStartDate": JsonField(required=True),
                }
            )
        )
        name = d.require_string(payload, "name", max_length=200)
        email = d.require_string(payload, "email", max_length=254)
        birth_date = d.require_date_yyyy_mm_dd(payload, "birthDate")
        treatment_start_date = d.require_date_yyyy_mm_dd(payload, "treatmentStartDate")
        return patient_controller.create_patient(
            org_id,
            name=name,
            email=email,
            birth_date=birth_date,
            treatment_start_date=treatment_start_date,
        )

    return bp
