import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import destinationsRouter from "./destinations";
import packagesRouter from "./packages";
import bookingsRouter from "./bookings";
import paymentsRouter from "./payments";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(destinationsRouter);
router.use(packagesRouter);
router.use(bookingsRouter);
router.use(paymentsRouter);
router.use(dashboardRouter);

export default router;
