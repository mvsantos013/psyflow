from __future__ import annotations

from flask import Blueprint
from flask import jsonify


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

    return bp
