vi.mock('../../../../validators/user');
vi.mock('../../../../dao/userDao');
vi.mock('../../../../service/application/disposableEmailService', () => ({
    checkEmail: vi.fn()
}));
vi.mock('../../../../utils/logger', () => ({
    warn: vi.fn()
}));

const validators = require('../../../../validators/user');
const userDao = require('../../../../dao/userDao');
const disposableService = require('../../../../service/application/disposableEmailService');
const logger = require('../../../../utils/logger');
const userService = require('../../../../service/application/userService');

describe('backend/service/application/userService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Set up default mocks
        validators.signupSchema = {
            validate: vi.fn().mockReturnValue({ error: null, value: {} })
        };
        validators.loginSchema = {
            validate: vi.fn().mockReturnValue({ error: null, value: {} })
        };
        disposableService.checkEmail = vi.fn().mockResolvedValue({ is_disposable: false });
        logger.warn = vi.fn();
        userDao.signup = vi.fn();
        userDao.login = vi.fn();
        vi.spyOn(userService, 'createDefaultTenant').mockResolvedValue('tenant-generated');
    });

    it('validate throws for unknown schema key', () => {
        expect(() => userService.validate('unknownSchema', {})).toThrow(
            'Validation schema not found for key: unknownSchema'
        );
    });

    it('signup validates payload and delegates to userDao.signup with existing tenant', async () => {
        validators.signupSchema.validate.mockReturnValue({
            error: null,
            value: { body: { email: 'alice@example.com' } }
        });
        userDao.findByFirebaseUid = vi.fn().mockResolvedValue(null);
        userDao.findUserByEmail = vi.fn().mockResolvedValue(null);
        userDao.signup = vi.fn().mockResolvedValue({ user_id: 'u1', email: 'alice@example.com', tenant_id: 'tenant-1' });

        const result = await userService.signup({ email: 'alice@example.com' }, { uid: 'uid-1', tenantId: 'tenant-1' });

        expect(userDao.signup).toHaveBeenCalledWith({ 
            email: 'alice@example.com', 
            firebase_uid: 'uid-1',
            tenant_id: 'tenant-1'
        });
        expect(userService.createDefaultTenant).not.toHaveBeenCalled();
        expect(result).toEqual({
            created: true,
            user: { user_id: 'u1', email: 'alice@example.com', tenant_id: 'tenant-1' }
        });
    });

    it('signup creates a default tenant when the token has no tenantId', async () => {
        validators.signupSchema.validate.mockReturnValue({
            error: null,
            value: { body: { email: 'alice@example.com' } }
        });
        userDao.findByFirebaseUid = vi.fn().mockResolvedValue(null);
        userDao.findUserByEmail = vi.fn().mockResolvedValue(null);
        userDao.signup = vi.fn().mockResolvedValue({ user_id: 'u1', email: 'alice@example.com', tenant_id: 'tenant-generated' });

        const result = await userService.signup({ email: 'alice@example.com' }, { uid: 'uid-1' });

        expect(userService.createDefaultTenant).toHaveBeenCalledWith('alice@example.com');
        expect(userDao.signup).toHaveBeenCalledWith({ 
            email: 'alice@example.com', 
            firebase_uid: 'uid-1',
            tenant_id: 'tenant-generated'
        });
        expect(result).toEqual({
            created: true,
            user: { user_id: 'u1', email: 'alice@example.com', tenant_id: 'tenant-generated' }
        });
    });

    it('login validates payload and delegates to userDao.login', async () => {
        validators.loginSchema.validate.mockReturnValue({
            error: null,
            value: { body: { email: 'alice@example.com' } }
        });
        userDao.findByFirebaseUid = vi.fn().mockResolvedValue(null);
        userDao.login = vi.fn().mockResolvedValue({ user_id: 'u1', email: 'alice@example.com' });

        const result = await userService.login('alice@example.com', { uid: 'uid-1' });

        expect(userDao.login).toHaveBeenCalledWith({ 
            email: 'alice@example.com', 
            firebase_uid: 'uid-1' 
        });
        expect(result).toEqual({ user_id: 'u1', email: 'alice@example.com' });
    });

    it('throws ValidationError when signup validation fails', async () => {
        validators.signupSchema.validate.mockReturnValue({
            error: {
                details: [{ message: '"email" is required' }]
            }
        });

        await expect(userService.signup({ body: {} })).rejects.toThrow('Validation failed');
        expect(userDao.signup).not.toHaveBeenCalled();
    });

    it('throws ValidationError when login validation fails', async () => {
        validators.loginSchema.validate.mockReturnValue({
            error: {
                details: [{ message: '"email" is required' }]
            }
        });

        await expect(userService.login({ body: {} })).rejects.toThrow('Validation failed');
        expect(userDao.login).not.toHaveBeenCalled();
    });
});
