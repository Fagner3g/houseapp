-- Renomear can_receive_notifications para notifications_enabled se necessário
DO $$ 
BEGIN
    -- Se can_receive_notifications existir e notifications_enabled NÃO existir, renomeia
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_organizations' 
               AND column_name='can_receive_notifications')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='user_organizations' 
                       AND column_name='notifications_enabled') THEN
        ALTER TABLE "user_organizations" RENAME COLUMN "can_receive_notifications" TO "notifications_enabled";
    END IF;
    
    -- Se nenhuma das duas existir, adiciona notifications_enabled
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_organizations' 
                   AND column_name='notifications_enabled')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='user_organizations' 
                       AND column_name='can_receive_notifications') THEN
        ALTER TABLE "user_organizations" ADD COLUMN "notifications_enabled" boolean DEFAULT true NOT NULL;
    END IF;
END $$;
