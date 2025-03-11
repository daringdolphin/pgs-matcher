"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export interface HeaderDescription {
  header: string
  description: string
}

interface HeaderDescriptionModalProps {
  headers: string[]
  isOpen: boolean
  onClose: () => void
  onSubmit: (descriptions: HeaderDescription[]) => void
}

export function HeaderDescriptionModal({
  headers,
  isOpen,
  onClose,
  onSubmit
}: HeaderDescriptionModalProps) {
  // Dynamically create a schema based on the headers
  const formSchema = z.object(
    headers.reduce<Record<string, z.ZodString>>((acc, header) => {
      acc[header] = z.string().min(1, {
        message: "Please provide a description for this header."
      })
      return acc
    }, {})
  )

  type FormValues = z.infer<typeof formSchema>

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: headers.reduce<Record<string, string>>((acc, header) => {
      acc[header] = ""
      return acc
    }, {})
  })

  const handleSubmit = (values: FormValues) => {
    const descriptions: HeaderDescription[] = headers.map(header => ({
      header,
      description: values[header]
    }))

    onSubmit(descriptions)
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Describe Your Data Headers</DialogTitle>
          <DialogDescription>
            Please provide a description for each column header to help the
            system better understand your data. The more detailed and specific
            your descriptions, the better the emission factor matching will be.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="grid max-h-[50vh] gap-6 overflow-y-auto pr-2">
              {headers.map(header => (
                <FormField
                  key={header}
                  control={form.control}
                  name={header}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{header}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`What does "${header}" represent? (e.g., fuel type, vehicle model, distance traveled)`}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide context about what this column contains and its
                        units if applicable.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save Descriptions</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
