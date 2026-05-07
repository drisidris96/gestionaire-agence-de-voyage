import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import destinationsRouter from "./destinations";
import packagesRouter from "./packages";
import bookingsRouter from "./bookings";
import paymentsRouter from "./payments";
import dashboardRouter from "./dashboard";
import storageRouter from "./storage";
import expensesRouter from "./expenses";
import settingsRouter from "./settings";
import employeesRouter from "./employees";
import payrollRouter from "./payroll";
import purchaseOrdersRouter from "./purchase-orders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(destinationsRouter);
router.use(packagesRouter);
router.use(bookingsRouter);
router.use(paymentsRouter);
router.use(dashboardRouter);
router.use(storageRouter);
router.use(expensesRouter);
router.use(settingsRouter);
router.use(employeesRouter);
router.use(payrollRouter);
router.use(purchaseOrdersRouter);

export default router;
