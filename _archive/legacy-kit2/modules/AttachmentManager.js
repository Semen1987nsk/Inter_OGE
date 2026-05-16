/**
 * AttachmentManager - Manages the queue of weight attachment operations
 * Ensures that weights are attached sequentially to avoid physics glitches
 */
export class AttachmentManager {
    constructor(experiment) {
        this.experiment = experiment;
        this.queue = [];
        this.processing = false;
    }

    /**
     * Add an attachment job to the queue
     * @param {Object} job - { weight, weightId }
     * @returns {Promise}
     */
    enqueue(job) {
        return new Promise((resolve, reject) => {
            this.queue.push({ ...job, resolve, reject });
            // console.log('[QUEUE] Task added', {
            //     weightId: job.weightId ?? job.weight?.id,
            //     pending: this.queue.length
            // });
            this.processQueue();
        });
    }

    clear() {
        this.queue.length = 0;
    }

    isBusy() {
        return this.processing;
    }

    async processQueue() {
        if (this.processing) return;

        const nextJob = this.queue.shift();
        if (!nextJob) return;

        this.processing = true;

        try {
            // Assumes experiment has attachWeight method
            await this.experiment.attachWeight(nextJob.weight);
            nextJob.resolve();
        } catch (error) {
            console.error('[QUEUE] Error processing attachment:', error);
            nextJob.reject(error);
        } finally {
            this.processing = false;
            // Process next item immediately
            this.processQueue();
        }
    }
}
