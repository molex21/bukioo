-- migrate:up

CREATE TABLE appointment_reschedule_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    appointment_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    occupied_start_at TIMESTAMPTZ NOT NULL,
    occupied_end_at TIMESTAMPTZ NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_CUSTOMER' CHECK (status IN ('PENDING_CUSTOMER', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
    message TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (appointment_id, organization_id) REFERENCES appointments(id, organization_id),
    FOREIGN KEY (employee_id, organization_id) REFERENCES employees(id, organization_id),
    FOREIGN KEY (business_id, organization_id) REFERENCES businesses(id, organization_id),
    CHECK (start_at < end_at)
);

CREATE INDEX appointment_reschedule_proposals_pending_idx
ON appointment_reschedule_proposals (appointment_id, expires_at)
WHERE status = 'PENDING_CUSTOMER';

-- migrate:down

DROP TABLE IF EXISTS appointment_reschedule_proposals;
