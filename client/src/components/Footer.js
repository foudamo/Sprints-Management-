import React from 'react';
import { Box, Container, Grid, Link, Typography, Divider } from '@mui/material';
import { footerLinks } from '../config/footerLinks';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e0e0e0',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="space-between">
          {footerLinks.map((section, index) => (
            <Grid item xs={12} sm={4} key={index}>
              <Typography variant="h6" color="text.primary" gutterBottom>
                {section.section}
              </Typography>
              <Box>
                {section.links.map((link, linkIndex) => (
                  <Box key={linkIndex} sx={{ mb: 1 }}>
                    <Link
                      href={link.url}
                      color="text.secondary"
                      sx={{
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: 'primary.main'
                        }
                      }}
                    >
                      {link.title}
                    </Link>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary" align="center">
          Made with love in Kitchener © {new Date().getFullYear()} All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
