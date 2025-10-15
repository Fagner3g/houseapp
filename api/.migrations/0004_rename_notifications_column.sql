-- Adicionar notifications_enabled se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_organizations' 
                   AND column_name='notifications_enabled') THEN
        ALTER TABLE "user_organizations" ADD COLUMN "notifications_enabled" boolean DEFAULT true NOT NULL;
    END IF;
    
    -- Se can_receive_notifications existir, copiar dados e remover
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_organizations' 
               AND column_name='can_receive_notifications') THEN
        ALTER TABLE "user_organizations" RENAME COLUMN "can_receive_notifications" TO "notifications_enabled";
    END IF;
END $$;
