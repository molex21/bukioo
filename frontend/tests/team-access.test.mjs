import assert from "node:assert/strict";
import test from "node:test";
import { canChangeMemberStatus, canManageMemberBusinesses, editableMemberRoles, linkableBusinesses, memberStatusLabel, roleChangeInput } from "../src/lib/team-access.ts";

const business = { id: "business-1", name: "Centro", status: "ACTIVE", hasAccess: true, employeeId: null, employeeIsActive: null, explicitlyAssigned: false, attendsAppointments: false };
const member = { membershipId: "membership-1", userId: "user-1", role: "EMPLOYEE", status: "ACTIVE", userStatus: "ACTIVE", businesses: [business] };
const platform = { id: "actor", isSuperadmin: true };

test("No se modifica el propietario, ni siquiera desde plataforma", () => {
  assert.deepEqual(editableMemberRoles({ ...member, role: "OWNER" }, platform), []);
});
test("Owner y superadmin gestionan administradores, managers y empleados", () => {
  for (const actor of [platform, { id: "owner", role: "OWNER", isSuperadmin: false }]) {
    assert.deepEqual(editableMemberRoles(member, actor), ["ADMIN", "MANAGER", "EMPLOYEE"]);
  }
});
test("Admin no puede modificarse ni gestionar administradores", () => {
  const admin = { id: "actor", role: "ADMIN", isSuperadmin: false };
  assert.deepEqual(editableMemberRoles({ ...member, userId: "actor" }, admin), []);
  assert.deepEqual(editableMemberRoles({ ...member, role: "ADMIN" }, admin), []);
  assert.deepEqual(editableMemberRoles(member, admin), ["MANAGER", "EMPLOYEE"]);
});
test("Cuentas y membresías inactivas no permiten gestionar rol ni vincular agenda", () => {
  for (const item of [{ ...member, status: "INVITED" }, { ...member, status: "SUSPENDED" }, { ...member, userStatus: "SUSPENDED" }, { ...member, role: "CLIENT" }]) {
    assert.deepEqual(editableMemberRoles(item, platform), []);
    assert.deepEqual(linkableBusinesses(item), []);
  }
});
test("El propietario puede tener agenda sin cambiar su rol", () => {
  const owner = { ...member, role: "OWNER" };
  assert.equal(linkableBusinesses(owner)[0].id, business.id);
  assert.equal(owner.role, "OWNER");
});
test("Una ficha archivada o activa impide crear otra", () => {
  for (const active of [true, false]) {
    assert.deepEqual(linkableBusinesses({ ...member, businesses: [{ ...business, employeeId: "existing", employeeIsActive: active }] }), []);
  }
});
test("No se vincula a negocios suspendidos o sin acceso", () => {
  for (const item of [{ ...business, hasAccess: false }, { ...business, status: "SUSPENDED" }]) {
    assert.deepEqual(linkableBusinesses({ ...member, businesses: [item] }), []);
  }
});
test("Al quitar ADMIN se envían negocios explícitos, incluso lista vacía", () => {
  assert.deepEqual(roleChangeInput({ ...member, role: "ADMIN" }, "EMPLOYEE", []), { role: "EMPLOYEE", businessIds: [] });
  assert.deepEqual(roleChangeInput({ ...member, role: "ADMIN" }, "MANAGER", ["b1"]), { role: "MANAGER", businessIds: ["b1"] });
});
test("Al asignar ADMIN no se envían businessIds; otros cambios conservan asignaciones", () => {
  assert.deepEqual(roleChangeInput(member, "ADMIN", ["b1"]), { role: "ADMIN" });
  assert.deepEqual(roleChangeInput(member, "MANAGER", []), { role: "MANAGER" });
});
test("Los estados se presentan en castellano", () => {
  assert.equal(memberStatusLabel("ACTIVE"), "Activa");
  assert.equal(memberStatusLabel("INVITED"), "Invitada");
  assert.equal(memberStatusLabel("SUSPENDED"), "Suspendida");
  assert.equal(memberStatusLabel("UNKNOWN"), "Estado no reconocido");
});

test("No se puede suspender al propietario, a uno mismo ni activar una invitación", () => {
  for (const item of [{ ...member, role: "OWNER" }, { ...member, userId: platform.id }, { ...member, status: "INVITED" }, { ...member, role: "CLIENT" }]) {
    assert.equal(canChangeMemberStatus(item, platform), false);
  }
});
test("Admin gestiona acceso de otros empleados y responsables, no administradores", () => {
  const admin = { id: "actor", role: "ADMIN", isSuperadmin: false };
  assert.equal(canChangeMemberStatus(member, admin), true);
  assert.equal(canChangeMemberStatus({ ...member, role: "MANAGER" }, admin), true);
  assert.equal(canChangeMemberStatus({ ...member, role: "ADMIN" }, admin), false);
  assert.equal(canManageMemberBusinesses(member, admin), true);
});
test("Restablecer requiere cuenta activa y no ofrece empresas para roles de acceso global", () => {
  assert.equal(canChangeMemberStatus({ ...member, status: "SUSPENDED" }, platform), true);
  assert.equal(canChangeMemberStatus({ ...member, status: "SUSPENDED", userStatus: "SUSPENDED" }, platform), false);
  for (const role of ["OWNER", "ADMIN"]) assert.equal(canManageMemberBusinesses({ ...member, role }, platform), false);
});
test("Se pueden preparar empresas de un usuario suspendido sin reactivarlo", () => {
  assert.equal(canManageMemberBusinesses({ ...member, status: "SUSPENDED" }, platform), true);
  assert.equal(canManageMemberBusinesses(member, { id: "actor", role: "EMPLOYEE", isSuperadmin: false }), false);
});
